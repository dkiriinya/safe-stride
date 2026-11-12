'use client';

import React from 'react';
import { useMapStore } from '@/store/map-store';
import { Shield, Zap, RefreshCw, Navigation } from 'lucide-react';

export const PreferenceSliders: React.FC = () => {
  const {
    effortTolerance,
    safetyStrictness,
    isRoundTrip,
    targetDistanceKm,
    setEffortTolerance,
    setSafetyStrictness,
    setIsRoundTrip,
    setTargetDistanceKm,
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
              fetchRoute();
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
              fetchRoute();
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

      {/* Target Distance Slider (When in Round Trip / Loop mode) */}
      {isRoundTrip && (
        <div className="p-3 rounded-2xl bg-dark-surface/60 border border-dark-border/40">
          <div className="flex items-center justify-between mb-1">
            <span className="font-ui text-xs font-medium text-dark-labelText">
              Target Loop Distance
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
    </div>
  );
};
