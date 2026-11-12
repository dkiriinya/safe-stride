'use client';

import React, { useState } from 'react';
import { useMapStore } from '@/store/map-store';
import { Tabs } from './Tabs';
import { MetricTile } from './MetricTile';
import { PreferenceSliders } from './PreferenceSliders';
import { ElevationScrubber } from '../chart/ElevationScrubber';
import { AIRouteAssistant } from './AIRouteAssistant';
import {
  Ruler,
  Clock,
  Flame,
  Gauge,
  Mountain,
  TrendingUp,
  BookmarkCheck,
  RotateCcw,
  Sparkles,
  Volume2,
  Accessibility,
} from 'lucide-react';

interface PlannerPanelProps {
  theme?: 'dark' | 'light';
}

export const PlannerPanel: React.FC<PlannerPanelProps> = ({ theme = 'dark' }) => {
  const {
    distanceKm,
    elevationGainM,
    estDurationMin,
    activeTab,
    setActiveTab,
    waypoints,
    isLoadingRoute,
    errorMessage,
    userPaceMinPerKm,
    setUserPaceMinPerKm,
    targetDistanceKm,
    isRoundTrip,
    wheelchairAccessible,
    speakRouteSummary,
    fetchRoute,
    clearWaypoints,
  } = useMapStore();

  const [isMobileExpanded, setIsMobileExpanded] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Derived pacing calculations based on runner's custom pace
  const paceMinutes = Math.floor(userPaceMinPerKm);
  const paceSeconds = Math.round((userPaceMinPerKm - paceMinutes) * 60);
  const formattedPace = `${String(paceMinutes).padStart(2, '0')}:${String(paceSeconds).padStart(2, '0')}`;

  const durationMinutes = Math.floor(estDurationMin);
  const durationSeconds = Math.round((estDurationMin - durationMinutes) * 60);
  const formattedDuration = `${String(durationMinutes).padStart(2, '0')}:${String(durationSeconds).padStart(2, '0')}`;

  // Energy formula: approx 68 kcal per km for standard runner + elevation adjustment
  const energyKcal = Math.round(distanceKm * 68 + elevationGainM * 0.4);

  const handleSaveRoute = async () => {
    setIsSaved(true);
    try {
      await fetch('/api/saved-routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Route ${distanceKm}km (${new Date().toLocaleDateString()})`,
          waypoints,
          distanceKm,
          elevationGainM,
        }),
      });
      setTimeout(() => setIsSaved(false), 3000);
    } catch {
      setIsSaved(false);
    }
  };

  return (
    <aside className="w-full md:w-[420px] md:h-[calc(100vh-4rem)] flex flex-col justify-between bg-dark-surfaceSolid/90 md:bg-dark-surfaceSolid/70 backdrop-blur-glass border-t md:border-t-0 md:border-r border-dark-border/60 z-20 transition-all shadow-glass-dark overflow-y-auto">
      {/* Mobile Drawer Grab Handle */}
      <div
        className="md:hidden flex items-center justify-center py-2 cursor-pointer border-b border-dark-border/40"
        onClick={() => setIsMobileExpanded(!isMobileExpanded)}
      >
        <div className="w-10 h-1 rounded-full bg-zinc-600 mb-1" />
      </div>

      <div className="p-4 sm:p-5 flex-1">
        {/* Navigation Tabs (SUMMARY, STATS, CHARTS) */}
        <Tabs activeTab={activeTab} onChange={setActiveTab} />

        {/* Error notification */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-ui">
            {errorMessage}
          </div>
        )}

        {/* AI Route Intelligence Assistant */}
        <AIRouteAssistant />

        {/* TAB 1: SUMMARY */}
        {activeTab === 'summary' && (
          <div className="space-y-4">
            {/* Top high-impact metric banner with accessibility support */}
            <div className="p-4 rounded-3xl bg-zinc-950/70 border border-dark-border/50 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-ui text-xs text-dark-labelText">
                    {waypoints.length >= 2 || (isRoundTrip && waypoints.length >= 1) ? 'Planned Route' : 'Set Start Location'}
                  </span>
                  {wheelchairAccessible && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-cyan-950/70 border border-cyan-700/50 text-[10px] text-cyan-300 font-medium">
                      <Accessibility className="w-3 h-3" /> Step-Free
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-display font-extrabold text-3xl text-dark-metricText tracking-tight">
                    {distanceKm > 0 ? distanceKm : '0.00'}
                  </span>
                  <span className="font-display font-bold text-sm text-dark-labelText">
                    km {targetDistanceKm ? `(target: ${targetDistanceKm} km)` : ''}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {distanceKm > 0 && (
                  <button
                    onClick={() => speakRouteSummary()}
                    className="p-2.5 rounded-2xl bg-cyan-950/40 border border-cyan-800/40 text-cyan-300 hover:bg-cyan-900/50 transition-all text-xs cursor-pointer"
                    title="Read route details aloud (Text-to-Speech)"
                    aria-label="Listen to route description aloud"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                )}
                {waypoints.length > 0 && (
                  <button
                    onClick={() => clearWaypoints()}
                    className="p-2 rounded-2xl bg-zinc-900 border border-zinc-800 text-rose-400 hover:bg-rose-500/10 transition-all text-xs cursor-pointer"
                    title="Clear route and start fresh"
                    aria-label="Clear route"
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={() => fetchRoute()}
                  disabled={isLoadingRoute || waypoints.length === 0}
                  className="p-2.5 rounded-2xl bg-dark-accent/15 border border-dark-accent/40 text-dark-accent hover:bg-dark-accent/25 transition-all disabled:opacity-40 cursor-pointer"
                  title="Recalculate route"
                  aria-label="Recalculate route"
                >
                  <RotateCcw className={`w-4 h-4 ${isLoadingRoute ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Accessible screen reader announcement region */}
            <div className="sr-only" role="status" aria-live="polite">
              {distanceKm > 0
                ? `Route calculated. Total distance ${distanceKm} kilometers with ${elevationGainM} meters ascent.`
                : 'No route planned.'}
            </div>

            {/* 6-Metric 2-Column Grid with SVG Glyphs */}
            <div className="grid grid-cols-2 gap-3">
              <MetricTile
                icon={<Ruler className="w-5 h-5 text-dark-accent" />}
                value={distanceKm > 0 ? distanceKm : '0.00'}
                unit="km"
                label="Distance"
              />
              <MetricTile
                icon={<Clock className="w-5 h-5 text-sky-400" />}
                value={distanceKm > 0 ? formattedDuration : '00:00'}
                unit="mins"
                label="Active Time"
              />
              <MetricTile
                icon={<Flame className="w-5 h-5 text-orange-400" />}
                value={distanceKm > 0 ? energyKcal : 0}
                unit="kcal"
                label="Energy"
              />
              <MetricTile
                icon={<Gauge className="w-5 h-5 text-emerald-400" />}
                value={formattedPace}
                unit="min/km"
                label="Pace"
              />
              <MetricTile
                icon={<Mountain className="w-5 h-5 text-violet-400" />}
                value={144}
                unit="m"
                label="Elevation"
              />
              <MetricTile
                icon={<TrendingUp className="w-5 h-5 text-indigo-400" />}
                value={elevationGainM || 0}
                unit="m"
                label="Ascent"
              />
            </div>

            {/* Custom Runner Pace Selector */}
            <div className="p-3.5 rounded-2xl bg-zinc-950/70 border border-dark-border/50 space-y-2">
              <div className="flex items-center justify-between text-xs font-ui">
                <span className="text-dark-labelText font-medium">Adjust Your Running Pace</span>
                <span className="font-mono text-dark-accent font-bold">{formattedPace} min/km</span>
              </div>
              <div className="flex items-center gap-1.5">
                {[
                  { label: 'Easy (6:30)', pace: 6.5 },
                  { label: 'Steady (5:30)', pace: 5.5 },
                  { label: 'Tempo (4:45)', pace: 4.75 },
                  { label: 'Fast (4:15)', pace: 4.25 },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setUserPaceMinPerKm(item.pace)}
                    className={`flex-1 py-1.5 px-1 rounded-xl text-[11px] font-ui transition-all cursor-pointer text-center ${
                      Math.abs(userPaceMinPerKm - item.pace) < 0.1
                        ? 'bg-dark-accent text-black font-bold shadow-md'
                        : 'bg-zinc-900 border border-zinc-800 text-dark-labelText hover:text-white hover:bg-zinc-800'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Inline Mini Elevation Scrubber */}
            <div className="pt-2">
              <ElevationScrubber theme={theme} />
            </div>
          </div>
        )}

        {/* TAB 2: STATS (Preference Sliders & Controls) */}
        {activeTab === 'stats' && (
          <div className="space-y-3">
            <h3 className="font-display font-bold text-sm text-dark-metricText">
              Routing Parameters
            </h3>
            <p className="font-ui text-xs text-dark-labelText">
              Fine-tune the multi-objective A* weights for hill tolerance and urban pedestrian safety.
            </p>
            <PreferenceSliders />
          </div>
        )}

        {/* TAB 3: CHARTS (Full Scrubber View) */}
        {activeTab === 'charts' && (
          <div className="space-y-4">
            <ElevationScrubber theme={theme} />
            <div className="p-3.5 rounded-2xl bg-dark-surface/60 border border-dark-border/40 space-y-2 text-xs font-ui">
              <div className="flex items-center justify-between">
                <span className="text-dark-labelText">Max Incline</span>
                <span className="font-display font-bold text-amber-400">7.8%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-dark-labelText">Average Incline</span>
                <span className="font-display font-bold text-dark-metricText">2.3%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-dark-labelText">Safe Road Coverage</span>
                <span className="font-display font-bold text-emerald-400">92%</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Sticky Action Bar */}
      <div className="p-4 border-t border-dark-border/40 bg-dark-surfaceSolid/90 backdrop-blur-md">
        <button
          onClick={handleSaveRoute}
          disabled={distanceKm === 0}
          className={`w-full py-3.5 px-4 rounded-2xl font-display font-bold text-sm tracking-wide flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg ${
            isSaved
              ? 'bg-emerald-500 text-black'
              : 'bg-dark-accent text-black hover:bg-[#b8e600] active:scale-[0.98]'
          } disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          {isSaved ? (
            <>
              <BookmarkCheck className="w-4 h-4" />
              <span>Route Saved!</span>
            </>
          ) : (
            <>
              <BookmarkCheck className="w-4 h-4" />
              <span>Save Route</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
};
