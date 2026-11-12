import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

export const aiRoute = new Hono();

const AIRecommendRequestSchema = z.object({
  prompt: z.string().optional().default(''),
  currentTime: z.string().optional(),
  currentLocation: z.tuple([z.number(), z.number()]).optional(),
  currentStats: z
    .object({
      distanceKm: z.number().optional(),
      elevationGainM: z.number().optional(),
      hazardsCount: z.number().optional(),
    })
    .optional(),
});

interface AIRecommendationResult {
  title: string;
  reasoning: string;
  targetDistanceKm: number;
  effortTolerance: number; // alpha (0..1)
  safetyStrictness: number; // beta (0..1)
  isRoundTrip: boolean;
  coachingAdvice: string;
  provider: 'openrouter' | 'gemini' | 'heuristic';
}

aiRoute.post('/recommend', zValidator('json', AIRecommendRequestSchema), async (c) => {
  const body = c.req.valid('json');
  const openrouterKey = process.env.OPENROUTER_API_KEY || '';
  const geminiKey = process.env.GEMINI_API_KEY || '';
  const userPrompt = body.prompt.trim();
  const timeStr = body.currentTime || new Date().toLocaleTimeString();

  const systemInstructions = `You are SafeStride's AI Running Coach and Urban Route Planner.
Your role is to translate runner requests, time of day, and goals into exact parameters for SafeStride's Multi-Objective A* routing engine.

Routing Parameters:
1. effortTolerance (alpha, 0.05 to 0.95):
   - 0.05 - 0.25: Minimal hills (heavy hill penalty). Flat recovery or easy runs.
   - 0.30 - 0.65: Moderate hills. Standard urban training.
   - 0.70 - 0.95: High hill tolerance. Uphill workouts and hill climbs.
2. safetyStrictness (beta, 0.10 to 0.98):
   - 0.85 - 0.98: Strict safety. Requires lit streets and sidewalks (crucial for evening/night runs).
   - 0.50 - 0.80: Balanced urban safety for daytime.
3. targetDistanceKm: Number between 1.0 and 42.2 km.
4. isRoundTrip: boolean (default true for loop courses returning to the runner's start point).

NAMING AND LANGUAGE RULES:
- Use clear, direct, and straightforward language.
- DO NOT use poetic or ambiguous names (such as "Evening Glow", "Moonlit Whisper", "Sunburst Journey").
- Use descriptive titles like "6.0 km Safe Evening Loop", "5.0 km Flat Recovery Route", "8.0 km Hill Training Route".

Return ONLY a valid JSON object matching this schema:
{
  "title": "Straightforward descriptive title (e.g. '6.0 km Safe Evening Loop')",
  "reasoning": "1-2 direct sentences explaining the distance, hill tolerance, and safety choices",
  "targetDistanceKm": number,
  "effortTolerance": number,
  "safetyStrictness": number,
  "isRoundTrip": boolean,
  "coachingAdvice": "1-2 practical, direct sentences on pacing or safety"
}`;

  const promptContent = `User Request: "${userPrompt || 'Recommend an optimal route for right now'}"
Local Time: ${timeStr}
Current Location: ${body.currentLocation ? `[${body.currentLocation[0]}, ${body.currentLocation[1]}]` : 'User GPS Location'}
Current Stats: ${JSON.stringify(body.currentStats || {})}`;

  // 1. Try OpenRouter (Primary)
  if (openrouterKey) {
    const models = ['openai/gpt-4o-mini', 'meta-llama/llama-3.3-70b-instruct'];
    for (const model of models) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openrouterKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://safestride.app',
            'X-Title': 'SafeStride AI Intelligence',
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemInstructions },
              { role: 'user', content: promptContent },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.2,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          const content = data.choices?.[0]?.message?.content;
          if (content) {
            const parsed = JSON.parse(content);
            const result: AIRecommendationResult = {
              title: parsed.title || '5.0 km Custom Route',
              reasoning: parsed.reasoning || 'Calibrated for your goals and safety preferences.',
              targetDistanceKm: Number(parsed.targetDistanceKm) || 5.0,
              effortTolerance: Math.min(0.95, Math.max(0.05, Number(parsed.effortTolerance) || 0.6)),
              safetyStrictness: Math.min(0.98, Math.max(0.10, Number(parsed.safetyStrictness) || 0.85)),
              isRoundTrip: typeof parsed.isRoundTrip === 'boolean' ? parsed.isRoundTrip : true,
              coachingAdvice: parsed.coachingAdvice || 'Maintain steady rhythm and stay mindful of road conditions.',
              provider: 'openrouter',
            };
            return c.json({ success: true, ...result });
          }
        }
      } catch (err) {
        console.warn(`OpenRouter (${model}) failed, trying fallback`, err);
      }
    }
  }

  // 2. Try Gemini API (Secondary Fallback)
  if (geminiKey) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
      const res = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: `${systemInstructions}\n\n${promptContent}` }],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.2,
          },
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const parsed = JSON.parse(text);
          const result: AIRecommendationResult = {
            title: parsed.title || '5.0 km Custom Route',
            reasoning: parsed.reasoning || 'Calibrated for your goals and safety preferences.',
            targetDistanceKm: Number(parsed.targetDistanceKm) || 5.0,
            effortTolerance: Math.min(0.95, Math.max(0.05, Number(parsed.effortTolerance) || 0.6)),
            safetyStrictness: Math.min(0.98, Math.max(0.10, Number(parsed.safetyStrictness) || 0.85)),
            isRoundTrip: typeof parsed.isRoundTrip === 'boolean' ? parsed.isRoundTrip : true,
            coachingAdvice: parsed.coachingAdvice || 'Maintain steady rhythm and stay mindful of road conditions.',
            provider: 'gemini',
          };
          return c.json({ success: true, ...result });
        }
      }
    } catch (err) {
      console.warn('Gemini direct API failed, using heuristic fallback', err);
    }
  }

  // 3. Smart Heuristic Fallback
  const isNight = timeStr.includes('PM') || timeStr.includes('pm') || timeStr.includes('19:') || timeStr.includes('20:') || timeStr.includes('21:') || timeStr.includes('22:');
  const lowerPrompt = userPrompt.toLowerCase();

  let targetDistanceKm = 5.0;
  let effortTolerance = 0.55;
  let safetyStrictness = isNight ? 0.95 : 0.80;
  let title = isNight ? '5.0 km Safe Evening Loop' : '5.0 km Balanced Urban Loop';
  let reasoning = isNight
    ? 'High safety strictness applied to prioritize street lighting and sidewalks for evening running.'
    : 'Balanced elevation and safety settings for steady urban training.';

  if (lowerPrompt.includes('recovery') || lowerPrompt.includes('easy') || lowerPrompt.includes('flat')) {
    title = '4.0 km Flat Recovery Route';
    effortTolerance = 0.15;
    targetDistanceKm = 4.0;
    reasoning = 'Heavy hill penalty applied to keep gradients flat and reduce muscle fatigue.';
  } else if (lowerPrompt.includes('hill') || lowerPrompt.includes('climb')) {
    title = '8.0 km Hill Training Route';
    effortTolerance = 0.85;
    targetDistanceKm = 8.0;
    reasoning = 'Hill penalty relaxed to route through rewarding elevation gains.';
  } else if (lowerPrompt.includes('10k') || lowerPrompt.includes('10 km')) {
    targetDistanceKm = 10.0;
    title = '10.0 km Urban Training Loop';
  } else if (lowerPrompt.includes('6k') || lowerPrompt.includes('6 km')) {
    targetDistanceKm = 6.0;
    title = isNight ? '6.0 km Safe Evening Loop' : '6.0 km Urban Route';
  }

  const result: AIRecommendationResult = {
    title,
    reasoning,
    targetDistanceKm,
    effortTolerance,
    safetyStrictness,
    isRoundTrip: true,
    coachingAdvice: 'Keep your stride light and stay alert at street crossings.',
    provider: 'heuristic',
  };

  return c.json({ success: true, ...result });
});
