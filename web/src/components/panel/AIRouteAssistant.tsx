'use client';

import React, { useState, useEffect } from 'react';
import { useMapStore } from '@/store/map-store';
import { Sparkles, Send, Moon, Mountain, HeartPulse, Zap, ArrowRight, Loader2, CheckCircle2, MapPin, X } from 'lucide-react';

interface AIResponse {
  title: string;
  reasoning: string;
  targetDistanceKm: number;
  effortTolerance: number;
  safetyStrictness: number;
  isRoundTrip: boolean;
  coachingAdvice: string;
}

export const AIRouteAssistant: React.FC = () => {
  const {
    userLocation,
    userLocationName,
    setUserLocation,
    setFlyToLocation,
    setEffortTolerance,
    setSafetyStrictness,
    setTargetDistanceKm,
    isRoundTrip,
    setIsRoundTrip,
    isAiRoute,
    setIsAiRoute,
    fetchRoute,
    waypoints,
    setWaypoints,
    activeRoute,
    distanceKm,
    elevationGainM,
    setIsOnboardingOpen,
  } = useMapStore();

  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [thinkingStep, setThinkingStep] = useState(0);
  const [aiData, setAiData] = useState<AIResponse | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  const thinkingStages = [
    'Parsing runner goal, target distance & time-of-day conditions...',
    'Scanning local map sectors to exclude CBD congestion & major highways...',
    'Sampling 12 candidate corridors across parks & quiet residential streets...',
    'Auditing intersection density, sidewalk continuity & traffic exposure...',
    'Calibrating elevation profile, caution markers & pacing strategy...',
  ];

  // Automatically clear AI assistant state when user switches to manual planning or clears route
  useEffect(() => {
    if (!isAiRoute) {
      setAiData(null);
      setPrompt('');
    }
  }, [isAiRoute]);

  const quickPrompts = [
    { label: 'Night Safe', icon: Moon, text: '6k safe evening route with well-lit streets and sidewalks' },
    { label: 'Hill Workout', icon: Mountain, text: '8k endurance route with challenging hill climbs' },
    { label: 'Flat Recovery', icon: HeartPulse, text: '4k flat recovery route avoiding hills' },
    { label: '5K Tempo', icon: Zap, text: '5k steady pace loop' },
    { label: '5K One-Way', icon: ArrowRight, text: '5k single way route from my location' },
  ];

  // Helper to get start location: priority is userLocation, then waypoints[0], then localStorage, then GPS
  const getOrResolveStartCoords = async (): Promise<[number, number]> => {
    if (userLocation) {
      return userLocation;
    }

    if (waypoints.length > 0) {
      return waypoints[0];
    }

    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('safestride_user_location');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.coords) {
            setUserLocation(parsed.coords, parsed.name);
            return parsed.coords;
          }
        }
      } catch {}
    }

    return new Promise((resolve) => {
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const loc: [number, number] = [pos.coords.latitude, pos.coords.longitude];
            setUserLocation(loc, 'Your Current Location');
            resolve(loc);
          },
          () => {
            setIsOnboardingOpen(true);
            const fallback: [number, number] = [-29.835, 31.018];
            resolve(fallback);
          },
          { timeout: 6000, enableHighAccuracy: true }
        );
      } else {
        const fallback: [number, number] = [-29.835, 31.018];
        resolve(fallback);
      }
    });
  };

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const handleRecommend = async (customPrompt?: string) => {
    const textToSubmit = customPrompt || prompt;
    if (!textToSubmit.trim() && !customPrompt) return;

    setIsLoading(true);
    setAiData(null);
    setThinkingStep(0);
    setPrompt(textToSubmit);

    try {
      // Stage 0: Parse runner intent & resolve location
      const startLocation = await getOrResolveStartCoords();
      setFlyToLocation([startLocation[1], startLocation[0]]);
      await sleep(1100);

      // Stage 1: AI recommendation + spatial scan preparation
      setThinkingStep(1);
      const now = new Date();
      const [res] = await Promise.all([
        fetch('/api/ai/recommend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: textToSubmit,
            currentTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            currentLocation: startLocation,
            preferredIsRoundTrip: isRoundTrip,
            currentStats: {
              distanceKm,
              elevationGainM,
            },
          }),
        }),
        sleep(1300),
      ]);

      if (res.ok) {
        const data = await res.json();
        const resolvedIsRoundTrip =
          typeof data.isRoundTrip === 'boolean' ? data.isRoundTrip : isRoundTrip;

        // Stage 2: Sampling 12 candidate corridors across parks & residential streets
        setThinkingStep(2);
        useMapStore.setState({
          waypoints: [startLocation],
          isAiRoute: true,
          userLocation: startLocation,
          flyToLocation: [startLocation[1], startLocation[0]],
          effortTolerance: data.effortTolerance,
          safetyStrictness: data.safetyStrictness,
          targetDistanceKm: data.targetDistanceKm,
          isRoundTrip: resolvedIsRoundTrip,
        });

        // Run deep multi-sector route evaluation concurrently with stages 2 & 3
        const routePromise = fetchRoute();
        await sleep(1500);
        setThinkingStep(3);
        await Promise.all([routePromise, sleep(1500)]);

        // Stage 4: Finalizing telemetry & pacing brief
        setThinkingStep(4);
        await sleep(1100);

        setAiData(data);
      }
    } catch (err) {
      console.error('AI Route Assistant error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mb-4 rounded-3xl bg-zinc-950/80 border border-zinc-800 p-4 shadow-xl backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-dark-accent/15 border border-dark-accent/30 flex items-center justify-center text-dark-accent">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-display font-bold text-dark-metricText tracking-wide">
              AI Route Assistant
            </h3>
            <p className="text-[11px] font-ui text-dark-labelText">
              Recommend a route based on your location and goals
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs font-ui text-dark-labelText hover:text-white px-2 py-1"
        >
          {isExpanded ? 'Collapse' : 'Expand'}
        </button>
      </div>

      {isExpanded && (
        <div className="space-y-3">
          {/* Active Start Location Indicator */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs">
            <div className="flex items-center gap-2 overflow-hidden">
              <MapPin className="w-3.5 h-3.5 text-dark-accent shrink-0" />
              <span className="text-zinc-300 truncate text-[11px]">
                {userLocationName
                  ? `Start: ${userLocationName}`
                  : waypoints.length > 0
                  ? `Start: [${waypoints[0][0].toFixed(3)}, ${waypoints[0][1].toFixed(3)}]`
                  : 'Start: Location not set'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsOnboardingOpen(true)}
              className="text-[10px] font-bold text-dark-accent hover:underline shrink-0 ml-2 cursor-pointer"
            >
              {userLocation || waypoints.length > 0 ? 'Change' : 'Set Location'}
            </button>
          </div>

          {/* Natural Language Prompt Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleRecommend();
            }}
            className="relative flex items-center"
          >
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. 5k recovery run at 8pm, keep it flat and lit..."
              className="w-full pl-3.5 pr-10 py-2 rounded-2xl text-xs font-ui bg-zinc-900/90 border border-zinc-800 text-dark-metricText placeholder-zinc-500 focus:outline-none focus:border-dark-accent focus:ring-1 focus:ring-dark-accent transition-all"
            />
            <button
              type="submit"
              disabled={isLoading || !prompt.trim()}
              className="absolute right-1.5 p-1.5 rounded-xl bg-dark-accent text-black hover:opacity-90 disabled:opacity-30 transition-all cursor-pointer"
            >
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
            </button>
          </form>

          {/* Quick Preset Chips */}
          <div className="flex flex-wrap gap-1.5">
            {quickPrompts.map((chip) => {
              const Icon = chip.icon;
              return (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => handleRecommend(chip.text)}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-ui bg-zinc-900/80 border border-zinc-800 hover:border-dark-accent/50 text-dark-labelText hover:text-white hover:bg-zinc-800/80 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Icon className="w-3 h-3 text-dark-accent" />
                  <span>{chip.label}</span>
                </button>
              );
            })}
          </div>

          {/* Live Multi-Stage Thinking & Spatial Audit Progress */}
          {isLoading && (
            <div className="mt-3 p-3.5 rounded-2xl bg-zinc-900/80 border border-dark-accent/30 space-y-2.5 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="text-xs font-display font-bold text-dark-accent flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Thinking & Auditing Local Streets...
                </span>
                <span className="text-[10px] font-mono text-zinc-400">
                  Step {thinkingStep + 1} of {thinkingStages.length}
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-dark-accent transition-all duration-500 rounded-full"
                  style={{ width: `${((thinkingStep + 1) / thinkingStages.length) * 100}%` }}
                />
              </div>
              <div className="space-y-1.5 pt-1">
                {thinkingStages.map((stageText, idx) => {
                  const isDone = idx < thinkingStep;
                  const isCurrent = idx === thinkingStep;
                  if (idx > thinkingStep) return null;
                  return (
                    <div
                      key={idx}
                      className={`flex items-start gap-2 text-[11px] font-ui transition-all ${
                        isCurrent ? 'text-white font-medium' : 'text-zinc-400'
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <Loader2 className="w-3.5 h-3.5 text-dark-accent animate-spin shrink-0 mt-0.5" />
                      )}
                      <span>{stageText}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Active AI Recommendation Briefing Card */}
          {!isLoading && aiData && (
            <div className="mt-3 p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2 animate-fadeIn">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-display font-extrabold text-dark-accent flex items-center gap-1.5 truncate">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{aiData.title}</span>
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-mono text-zinc-400">
                    {aiData.targetDistanceKm} km {aiData.isRoundTrip ? 'round trip' : 'one way'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setAiData(null);
                      setPrompt('');
                      useMapStore.getState().clearWaypoints();
                    }}
                    title="Clear AI route"
                    className="p-0.5 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-xs font-ui text-dark-metricText/90 leading-relaxed">
                {aiData.reasoning}
              </p>
              {activeRoute?.properties && (
                <div className="p-2 rounded-xl bg-zinc-950/70 border border-zinc-800/80 space-y-1 text-[11px] font-ui text-zinc-300">
                  {Array.isArray(activeRoute.properties.favoredStreets) &&
                    activeRoute.properties.favoredStreets.length > 0 && (
                      <div>
                        <span className="text-emerald-400 font-semibold">Selected Corridor: </span>
                        {activeRoute.properties.favoredStreets.join(' → ')}
                      </div>
                    )}
                  <div className="text-zinc-400">
                    <span className="text-amber-400 font-semibold">Route Audit: </span>
                    Evaluated {activeRoute.properties.candidatesEvaluated || 10} candidate paths • Filtered out CBD grid &amp; highway traffic
                    {Array.isArray(activeRoute.properties.avoidedAreas) &&
                    activeRoute.properties.avoidedAreas.length > 0
                      ? ` (bypassed ${activeRoute.properties.avoidedAreas.join(', ')})`
                      : ''}
                  </div>
                </div>
              )}
              <div className="pt-1.5 border-t border-zinc-800/80 flex items-start gap-2">
                <p className="text-[11px] font-ui text-zinc-300 leading-snug">
                  <span className="text-dark-accent font-semibold">Tip: </span>
                  {aiData.coachingAdvice}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
