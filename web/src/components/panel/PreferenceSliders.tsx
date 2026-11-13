'use client';

import React from 'react';
import { useMapStore } from '@/store/map-store';
import { Shield, Zap, RefreshCw, Navigation, Accessibility, Volume2, Eye } from 'lucide-react';

export const PreferenceSliders: React.FC = () => {
  const {
    waypoints,
    effortTolerance,
    safetyStrictness,
    isRoundTrip,
    targetDistanceKm,
    wheelchairAccessible,
    highContrast,
    setEffortTolerance,
    setSafetyStrictness,
    setIsRoundTrip,
    setTargetDistanceKm,
    setWheelchairAccessible,
    setHighContrast,
    speakRouteSummary,
    fetchRoute,
  } = useMapStore();

  return (
    <div className="space-y-4 pt-2">
      {/* Route Type Toggle (from image_7a215e.png) */}
      <div className="flex items-center justify-between p-3 rounded-2xl bg-dark-surface/60 border border-dark-border/40">
        <span className="font-ui text-xs font-medium text-dark-labelText">
          Route Type
        </span>
        <div className="flex items-center gap-1 p-1 bg-zinc-950/80 rounded-xl border border-dark-border/50">
          <button
            onClick={() => {
              setIsRoundTrip(false);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-ui font-medium transition-all ${
              !isRoundTrip
                ? 'bg-dark-accent text-black font-semibold shadow-sm'
                : 'text-dark-labelText hover:text-white'
            }`}
          >
            One Way
          </button>
          <button
            onClick={() => {
              setIsRoundTrip(true);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-ui font-medium transition-all ${
              isRoundTrip
                ? 'bg-dark-accent text-black font-semibold shadow-sm'
                : 'text-dark-labelText hover:text-white'
            }`}
          >
            Round Trip
          </button>
        </div>
      </div>

      {/* Target Distance Slider (Round Trip or AI/Auto One-Way with single start point) */}
      {(isRoundTrip || waypoints.length <= 1) && (
        <div className="p-3 rounded-2xl bg-dark-surface/60 border border-dark-border/40">
          <div className="flex items-center justify-between mb-1">
            <span className="font-ui text-xs font-medium text-dark-labelText">
              {isRoundTrip ? 'Target Loop Distance' : 'Target One-Way Distance'}
            </span>
            <span className="font-display font-bold text-xs text-dark-accent">
              {(targetDistanceKm || 8.0).toFixed(1)} km
            </span>
          </div>
          {/* 44px min-height touch target */}
          <div className="min-h-[44px] flex items-center">
            <input
              type="range"
              min="2"
              max="25"
              step="0.5"
              value={targetDistanceKm || 8.0}
              onChange={(e) => setTargetDistanceKm(parseFloat(e.target.value))}
              onMouseUp={() => fetchRoute()}
              onTouchEnd={() => fetchRoute()}
              className="w-full accent-dark-accent h-2 bg-zinc-800 rounded-lg cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* Effort Tolerance Slider (alpha) - min 44px touch target */}
      <div className="p-3.5 rounded-2xl bg-dark-surface/60 border border-dark-border/40">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-ui text-xs font-medium text-dark-labelText">
              Effort Tolerance (Hill Penalty)
            </span>
          </div>
          <span className="font-display font-bold text-xs text-dark-metricText">
            {Math.round(effortTolerance * 100)}%
          </span>
        </div>
        <p className="font-ui text-[11px] text-dark-labelText/70 mb-1">
          {effortTolerance > 0.7
            ? 'Accepts hills for shorter path'
            : effortTolerance < 0.3
            ? 'Flat routes prioritized heavily'
            : 'Balanced grade routing'}
        </p>
        <div className="min-h-[44px] flex items-center">
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={effortTolerance}
            onChange={(e) => setEffortTolerance(parseFloat(e.target.value))}
            onMouseUp={() => fetchRoute()}
            onTouchEnd={() => fetchRoute()}
            className="w-full accent-dark-accent h-2 bg-zinc-800 rounded-lg cursor-pointer"
          />
        </div>
      </div>

      {/* Safety Strictness Slider (beta) - min 44px touch target */}
      <div className="p-3.5 rounded-2xl bg-dark-surface/60 border border-dark-border/40">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-ui text-xs font-medium text-dark-labelText">
              Safety Strictness (Lighting & Sidewalks)
            </span>
          </div>
          <span className="font-display font-bold text-xs text-dark-metricText">
            {Math.round(safetyStrictness * 100)}%
          </span>
        </div>
        <p className="font-ui text-[11px] text-dark-labelText/70 mb-1">
          {safetyStrictness > 0.75
            ? 'Enforces lit paths and verified sidewalks'
            : 'Relaxed pedestrian safety criteria'}
        </p>
        <div className="min-h-[44px] flex items-center">
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={safetyStrictness}
            onChange={(e) => setSafetyStrictness(parseFloat(e.target.value))}
            onMouseUp={() => fetchRoute()}
            onTouchEnd={() => fetchRoute()}
            className="w-full accent-dark-accent h-2 bg-zinc-800 rounded-lg cursor-pointer"
          />
        </div>
      </div>

      {/* Accessibility & Inclusivity Mode */}
      <div className="p-3.5 rounded-2xl bg-dark-surface/60 border border-dark-border/40 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Accessibility className="w-4 h-4 text-cyan-400" />
            <span className="font-ui text-xs font-semibold text-white">
              Accessibility & Inclusivity
            </span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-cyan-950/60 border border-cyan-800/40 text-cyan-300">
            A11y
          </span>
        </div>

        {/* Step-Free & Wheelchair Friendly Toggle */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/70 border border-dark-border/40">
          <div>
            <span className="text-xs font-ui font-medium text-dark-metricText block">
              Step-Free & Wheelchair Mode
            </span>
            <span className="text-[10px] font-ui text-dark-labelText">
              Caps grade to &lt;6%, avoids stairs & unpaved paths
            </span>
          </div>
          <button
            onClick={() => setWheelchairAccessible(!wheelchairAccessible)}
            aria-pressed={wheelchairAccessible}
            aria-label="Toggle step-free and wheelchair friendly routing"
            className={`px-3 py-1.5 rounded-lg text-xs font-ui font-semibold transition-all cursor-pointer ${
              wheelchairAccessible
                ? 'bg-cyan-400 text-black shadow-md shadow-cyan-950'
                : 'bg-zinc-900 border border-zinc-700 text-dark-labelText hover:text-white'
            }`}
          >
            {wheelchairAccessible ? 'Active' : 'Off'}
          </button>
        </div>

        {/* Voice Route Narration Button */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/70 border border-dark-border/40">
          <div>
            <span className="text-xs font-ui font-medium text-dark-metricText block">
              Audio Route Narration
            </span>
            <span className="text-[10px] font-ui text-dark-labelText">
              Read aloud distance, time, and safety alerts
            </span>
          </div>
          <button
            onClick={() => speakRouteSummary()}
            aria-label="Read route summary aloud"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-ui font-semibold bg-dark-accent/15 border border-dark-accent/40 text-dark-accent hover:bg-dark-accent/25 transition-all cursor-pointer"
          >
            <Volume2 className="w-3.5 h-3.5" />
            Listen
          </button>
        </div>

        {/* High Contrast View */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/70 border border-dark-border/40">
          <div>
            <span className="text-xs font-ui font-medium text-dark-metricText block">
              Enhanced Contrast Mode
            </span>
            <span className="text-[10px] font-ui text-dark-labelText">
              High-contrast borders & bold indicators
            </span>
          </div>
          <button
            onClick={() => setHighContrast(!highContrast)}
            aria-pressed={highContrast}
            aria-label="Toggle high contrast accessibility view"
            className={`px-3 py-1.5 rounded-lg text-xs font-ui font-semibold transition-all cursor-pointer ${
              highContrast
                ? 'bg-yellow-400 text-black shadow-md'
                : 'bg-zinc-900 border border-zinc-700 text-dark-labelText hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5 inline mr-1" />
            {highContrast ? 'On' : 'Off'}
          </button>
        </div>
      </div>
    </div>
  );
};
