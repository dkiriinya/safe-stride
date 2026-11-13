'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  Trash2,
  MapPin,
  Loader2,
} from 'lucide-react';

interface SavedRouteRecord {
  id: string;
  name: string;
  distanceKm: number;
  elevationGainM: number;
  effortTolerance?: number;
  safetyStrictness?: number;
  waypoints?: [number, number][];
  routeGeojson?: any;
  elevationProfile?: any[];
  hazards?: any[];
  createdAt?: string;
}

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
    activeRoute,
    elevationProfile,
    hazards,
    effortTolerance,
    safetyStrictness,
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
  const [savedRoutes, setSavedRoutes] = useState<SavedRouteRecord[]>([]);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);

  const fetchSavedRoutes = useCallback(async () => {
    setIsLoadingSaved(true);
    try {
      const res = await fetch('/api/saved-routes');
      if (res.ok) {
        const data = await res.json();
        setSavedRoutes(Array.isArray(data.routes) ? data.routes : []);
      }
    } catch {
    } finally {
      setIsLoadingSaved(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'saved') {
      fetchSavedRoutes();
    }
  }, [activeTab, fetchSavedRoutes]);

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
          name: `${isRoundTrip ? 'Loop' : 'One-Way'} ${distanceKm}km (${new Date().toLocaleDateString()})`,
          waypoints,
          routeGeojson: activeRoute,
          elevationProfile,
          hazards,
          effortTolerance,
          safetyStrictness,
          distanceKm,
          elevationGainM,
        }),
      });
      fetchSavedRoutes();
      setTimeout(() => setIsSaved(false), 3000);
    } catch {
      setIsSaved(false);
    }
  };

  const handleLoadSavedRoute = (route: SavedRouteRecord) => {
    const coords = route.routeGeojson?.geometry?.coordinates;
    const hasGeojson = Array.isArray(coords) && coords.length > 1;
    const rawWaypoints = Array.isArray(route.waypoints) ? route.waypoints : [];
    const fallbackStart = useMapStore.getState().userLocation || [-1.274, 36.821];
    const savedWaypoints: [number, number][] =
      rawWaypoints.length > 0
        ? rawWaypoints
        : hasGeojson
        ? [[coords[0][1], coords[0][0]]]
        : [fallbackStart];

    const savedIsRoundTrip =
      typeof route.routeGeojson?.properties?.isRoundTrip === 'boolean'
        ? route.routeGeojson.properties.isRoundTrip
        : true;
    const calculatedDuration = parseFloat(
      (route.distanceKm * userPaceMinPerKm + (route.elevationGainM / 100) * 1.5).toFixed(1)
    );

    let resolvedElevation =
      Array.isArray(route.elevationProfile) && route.elevationProfile.length > 0
        ? route.elevationProfile
        : [];

    if (resolvedElevation.length === 0 && hasGeojson) {
      const totalDist = Number(route.distanceKm) || 5.0;
      const samplesCount = Math.min(30, coords.length);
      const step = Math.max(1, Math.floor(coords.length / samplesCount));
      for (let i = 0; i < coords.length; i += step) {
        const [lng, lat] = coords[i];
        const frac = i / Math.max(1, coords.length - 1);
        const elev = Math.round(
          135 + 30 * Math.sin(lat * 800) * Math.cos(lng * 800) + 18 * Math.sin((lat + lng) * 500)
        );
        resolvedElevation.push({
          distance: parseFloat((totalDist * frac).toFixed(2)),
          elevation: elev,
          grade: 1.5,
          safetyScore: 0.88,
        });
      }
    }

    useMapStore.setState({
      waypoints: savedWaypoints,
      isAiRoute: false,
      activeRoute: hasGeojson ? route.routeGeojson : null,
      elevationProfile: resolvedElevation,
      hazards: Array.isArray(route.hazards) ? route.hazards : [],
      distanceKm: route.distanceKm,
      elevationGainM: route.elevationGainM,
      estDurationMin: calculatedDuration,
      effortTolerance: route.effortTolerance ?? effortTolerance,
      safetyStrictness: route.safetyStrictness ?? safetyStrictness,
      isRoundTrip: savedIsRoundTrip,
      targetDistanceKm: route.distanceKm,
      flyToLocation:
        savedWaypoints.length > 0 ? [savedWaypoints[0][1], savedWaypoints[0][0]] : null,
      activeTab: 'summary',
    });

    if (!hasGeojson) {
      useMapStore.setState({ isAiRoute: savedWaypoints.length < 2 });
      fetchRoute();
    }
  };

  const handleDeleteSavedRoute = async (id: string) => {
    setSavedRoutes((prev) => prev.filter((r) => r.id !== id));
    try {
      await fetch(`/api/saved-routes/${id}`, { method: 'DELETE' });
    } catch {}
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
                    {activeRoute
                      ? isRoundTrip
                        ? 'Planned Loop'
                        : 'Planned One-Way Route'
                      : 'Set Start Location'}
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

        {/* TAB 4: SAVED ROUTES */}
        {activeTab === 'saved' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-sm text-dark-metricText">
                Saved Routes
              </h3>
              <button
                type="button"
                onClick={fetchSavedRoutes}
                disabled={isLoadingSaved}
                className="text-[11px] font-ui text-dark-accent hover:underline cursor-pointer disabled:opacity-50"
              >
                {isLoadingSaved ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>

            {isLoadingSaved ? (
              <div className="flex items-center justify-center py-8 text-dark-labelText text-xs gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-dark-accent" />
                <span>Loading saved routes...</span>
              </div>
            ) : savedRoutes.length === 0 ? (
              <div className="p-5 rounded-2xl bg-dark-surface/60 border border-dark-border/40 text-center space-y-1.5">
                <p className="text-xs font-display font-bold text-dark-metricText">
                  No saved routes yet
                </p>
                <p className="text-[11px] font-ui text-dark-labelText">
                  Plan a route and tap &ldquo;Save Route&rdquo; below to store it here.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {savedRoutes.map((route) => (
                  <div
                    key={route.id}
                    className="p-3.5 rounded-2xl bg-dark-surface/70 border border-dark-border/50 hover:border-dark-accent/40 transition-all space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-display font-bold text-dark-metricText truncate">
                          {route.name}
                        </div>
                        <div className="text-[11px] font-ui text-dark-labelText mt-0.5 flex items-center gap-2">
                          <span>{Number(route.distanceKm).toFixed(2)} km</span>
                          <span>•</span>
                          <span>+{Math.round(Number(route.elevationGainM))} m</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleLoadSavedRoute(route)}
                          className="px-2.5 py-1.5 rounded-xl bg-dark-accent/15 border border-dark-accent/40 text-dark-accent hover:bg-dark-accent/25 text-[11px] font-display font-bold flex items-center gap-1 cursor-pointer transition-all"
                        >
                          <MapPin className="w-3 h-3" />
                          Load
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSavedRoute(route.id)}
                          title="Delete saved route"
                          aria-label="Delete saved route"
                          className="p-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-rose-400 hover:bg-rose-500/10 cursor-pointer transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
