'use client';

import React, { useState } from 'react';
import { useMapStore } from '@/store/map-store';
import { Sparkles, Send, Moon, Mountain, HeartPulse, Zap, Loader2, CheckCircle2, MapPin } from 'lucide-react';

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
    setIsRoundTrip,
    fetchRoute,
    waypoints,
    setWaypoints,
    distanceKm,
    elevationGainM,
    setIsOnboardingOpen,
  } = useMapStore();

  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiData, setAiData] = useState<AIResponse | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  const quickPrompts = [
    { label: 'Night Safe', icon: Moon, text: '6k safe evening route with well-lit streets and sidewalks' },
    { label: 'Hill Workout', icon: Mountain, text: '8k endurance route with challenging hill climbs' },
    { label: 'Flat Recovery', icon: HeartPulse, text: '4k flat recovery route avoiding hills' },
    { label: '5K Tempo', icon: Zap, text: '5k steady pace loop' },
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

  const handleRecommend = async (customPrompt?: string) => {
    const textToSubmit = customPrompt || prompt;
    if (!textToSubmit.trim() && !customPrompt) return;

    setIsLoading(true);
    setPrompt(textToSubmit);

    try {
      // 1. Ensure we have an explicit starting location from the user
      const startLocation = await getOrResolveStartCoords();

      // Ensure waypoints and map center on this location immediately
      setWaypoints([startLocation]);
      setFlyToLocation([startLocation[1], startLocation[0]]);

      const now = new Date();
      const res = await fetch('/api/ai/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textToSubmit,
          currentTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          currentLocation: startLocation,
          currentStats: {
            distanceKm,
            elevationGainM,
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAiData(data);

        // Update all parameters simultaneously so fetchRoute executes with the exact target distance & location
        useMapStore.setState({
          waypoints: [startLocation],
          userLocation: startLocation,
          flyToLocation: [startLocation[1], startLocation[0]],
          effortTolerance: data.effortTolerance,
          safetyStrictness: data.safetyStrictness,
          targetDistanceKm: data.targetDistanceKm,
          isRoundTrip: true,
        });

        // Trigger route calculation starting and ending at user's location
        await fetchRoute();
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

          {/* Active AI Recommendation Briefing Card */}
          {aiData && (
            <div className="mt-3 p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="text-xs font-display font-extrabold text-dark-accent flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {aiData.title}
                </span>
                <span className="text-[10px] font-mono text-zinc-400">
                  {aiData.targetDistanceKm} km round trip
                </span>
              </div>
              <p className="text-xs font-ui text-dark-metricText/90 leading-relaxed">
                {aiData.reasoning}
              </p>
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
