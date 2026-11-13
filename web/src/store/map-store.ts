import { create } from 'zustand';
import { RouteResponse, ElevationSample, Hazard, GeoJSONFeature } from '@/contracts/route';

export type TabKey = 'summary' | 'stats' | 'charts' | 'saved';

interface MapState {
  // Required by architectural guidelines
  waypoints: [number, number][];
  activeRoute: GeoJSONFeature | null;
  elevationProfile: ElevationSample[];
  hoveredDistance: number | null;

  // Sliders and planner preferences
  effortTolerance: number; // alpha (0..1)
  safetyStrictness: number; // beta (0..1)
  targetDistanceKm: number | null;
  isRoundTrip: boolean;
  userPaceMinPerKm: number; // minutes per km, default 5.5 (5:30/km)

  // Telemetry metadata
  distanceKm: number;
  elevationGainM: number;
  estDurationMin: number;
  hazards: Hazard[];

  // Navigation & Location search
  flyToLocation: [number, number] | null; // [lng, lat]
  setFlyToLocation: (loc: [number, number] | null) => void;

  // UI state
  isLoadingRoute: boolean;
  errorMessage: string | null;
  activeTab: TabKey;
  activeHazardId: string | null;
  isAiRoute: boolean;
  setIsAiRoute: (val: boolean) => void;

  // Actions
  setWaypoints: (waypoints: [number, number][]) => void;
  addWaypoint: (point: [number, number]) => void;
  removeWaypoint: (index: number) => void;
  undoWaypoint: () => void;
  clearWaypoints: () => void;

  setHoveredDistance: (distance: number | null) => void;
  setEffortTolerance: (val: number) => void;
  setSafetyStrictness: (val: number) => void;
  setTargetDistanceKm: (val: number | null) => void;
  setIsRoundTrip: (val: boolean) => void;
  setUserPaceMinPerKm: (pace: number) => void;
  setActiveTab: (tab: TabKey) => void;
  setActiveHazardId: (id: string | null) => void;

  // User Location
  userLocation: [number, number] | null;
  userLocationName: string;
  setUserLocation: (coords: [number, number], name?: string) => void;

  // Accessibility & Inclusivity
  wheelchairAccessible: boolean;
  highContrast: boolean;
  setWheelchairAccessible: (val: boolean) => void;
  setHighContrast: (val: boolean) => void;
  speakRouteSummary: () => void;

  // Onboarding & Preferences
  isOnboardingOpen: boolean;
  setIsOnboardingOpen: (open: boolean) => void;
  runnerGoal: 'night' | 'fitness' | 'hills' | 'flat';
  setRunnerGoal: (goal: 'night' | 'fitness' | 'hills' | 'flat') => void;
  applyOnboardingPreferences: (prefs: {
    goal: 'night' | 'fitness' | 'hills' | 'flat';
    pace: number;
    distanceKm: number;
    startCoords?: [number, number];
  }) => void;

  fetchRoute: () => Promise<void>;
  resetRoute: () => void;
}

export const useMapStore = create<MapState>((set, get) => ({
  // User location and starting waypoints (defaults to empty until user selects or GPS locates)
  userLocation: null,
  userLocationName: '',
  waypoints: [],
  activeRoute: null,
  elevationProfile: [],
  hoveredDistance: null,

  effortTolerance: 0.6,
  safetyStrictness: 0.85,
  targetDistanceKm: 5.0,
  isRoundTrip: true,
  userPaceMinPerKm: 5.5,

  // Accessibility defaults
  wheelchairAccessible: false,
  highContrast: false,
  setWheelchairAccessible: (val) => {
    set({ wheelchairAccessible: val });
    const { waypoints, isAiRoute } = get();
    if (waypoints.length >= 2 || (isAiRoute && waypoints.length >= 1)) {
      get().fetchRoute();
    }
  },
  setHighContrast: (val) => set({ highContrast: val }),

  speakRouteSummary: () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const { distanceKm, estDurationMin, elevationGainM, hazards, wheelchairAccessible } = get();
    if (distanceKm <= 0) {
      const u = new SpeechSynthesisUtterance('No route planned yet. Choose a start location to plan your route.');
      window.speechSynthesis.speak(u);
      return;
    }
    const accessText = wheelchairAccessible
      ? 'This route is optimized for step-free access and minimal incline.'
      : '';
    const text = `Route planned: ${distanceKm} kilometers, estimated active time of ${Math.round(estDurationMin)} minutes with ${Math.round(elevationGainM)} meters of ascent. ${hazards.length} caution segments noted. ${accessText}`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  }, // 5:30 min/km default

  distanceKm: 0,
  elevationGainM: 0,
  estDurationMin: 0,
  hazards: [],

  flyToLocation: null,
  setFlyToLocation: (loc) => set({ flyToLocation: loc }),

  setUserLocation: (coords, name) => {
    const locName = name || 'My Location';
    set({
      userLocation: coords,
      userLocationName: locName,
      flyToLocation: [coords[1], coords[0]],
    });
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          'safestride_user_location',
          JSON.stringify({ coords, name: locName })
        );
      } catch {}
    }
  },

  isLoadingRoute: false,
  errorMessage: null,
  activeTab: 'summary',
  activeHazardId: null,
  isAiRoute: false,
  setIsAiRoute: (val) => set({ isAiRoute: val }),

  isOnboardingOpen: false,
  setIsOnboardingOpen: (open) => set({ isOnboardingOpen: open }),
  runnerGoal: 'fitness',
  setRunnerGoal: (goal) => set({ runnerGoal: goal }),
  applyOnboardingPreferences: ({ goal, pace, distanceKm, startCoords }) => {
    let safetyStrictness = 0.85;
    let effortTolerance = 0.6;
    if (goal === 'night') {
      safetyStrictness = 0.95;
      effortTolerance = 0.6;
    } else if (goal === 'hills') {
      safetyStrictness = 0.65;
      effortTolerance = 0.15;
    } else if (goal === 'flat') {
      safetyStrictness = 0.80;
      effortTolerance = 0.95;
    }

    const updates: Partial<MapState> = {
      runnerGoal: goal,
      userPaceMinPerKm: pace,
      targetDistanceKm: distanceKm,
      safetyStrictness,
      effortTolerance,
      isOnboardingOpen: false,
    };

    if (startCoords) {
      updates.userLocation = startCoords;
      updates.userLocationName = 'Start Location';
      updates.flyToLocation = [startCoords[1], startCoords[0]];
    }

    set(updates);
  },

  setWaypoints: (waypoints) => {
    set({ waypoints, isAiRoute: false });
    if (waypoints.length >= 2) {
      get().fetchRoute();
    } else {
      get().resetRoute();
    }
  },

  addWaypoint: (point) => {
    const current = get().waypoints;
    const nextWaypoints = [...current, point];
    set({ waypoints: nextWaypoints, isAiRoute: false });
    if (nextWaypoints.length >= 2) {
      get().fetchRoute();
    } else {
      get().resetRoute();
    }
  },

  removeWaypoint: (index) => {
    const next = get().waypoints.filter((_, idx) => idx !== index);
    set({ waypoints: next, isAiRoute: false });
    if (next.length >= 2) {
      get().fetchRoute();
    } else {
      get().resetRoute();
    }
  },

  undoWaypoint: () => {
    const current = get().waypoints;
    if (current.length === 0) return;
    const next = current.slice(0, -1);
    set({ waypoints: next, isAiRoute: false });
    if (next.length >= 2) {
      get().fetchRoute();
    } else {
      get().resetRoute();
    }
  },

  clearWaypoints: () => {
    set({
      waypoints: [],
      isAiRoute: false,
      activeRoute: null,
      elevationProfile: [],
      hoveredDistance: null,
      distanceKm: 0,
      elevationGainM: 0,
      estDurationMin: 0,
      hazards: [],
      errorMessage: null,
    });
  },

  setHoveredDistance: (distance) => set({ hoveredDistance: distance }),
  setEffortTolerance: (val) => set({ effortTolerance: val }),
  setSafetyStrictness: (val) => set({ safetyStrictness: val }),
  setTargetDistanceKm: (val) => set({ targetDistanceKm: val }),
  setIsRoundTrip: (val) => {
    set({ isRoundTrip: val });
    const { waypoints, isAiRoute } = get();
    if (waypoints.length >= 2 || (isAiRoute && waypoints.length >= 1)) {
      get().fetchRoute();
    }
  },
  setUserPaceMinPerKm: (pace) => {
    set({ userPaceMinPerKm: pace });
    const { distanceKm, elevationGainM } = get();
    if (distanceKm > 0) {
      const estDurationMin = parseFloat((distanceKm * pace + (elevationGainM / 100) * 1.5).toFixed(1));
      set({ estDurationMin });
    }
  },
  setActiveTab: (tab) => set({ activeTab: tab }),
  setActiveHazardId: (id) => set({ activeHazardId: id }),

  fetchRoute: async () => {
    const { waypoints, isAiRoute, effortTolerance, safetyStrictness, isRoundTrip, targetDistanceKm, userPaceMinPerKm, wheelchairAccessible } = get();
    if (waypoints.length === 0) return;
    if (!isAiRoute && waypoints.length < 2) return;

    set({ isLoadingRoute: true, errorMessage: null });

    try {
      const payload = {
        startCoords: waypoints[0],
        endCoords: isRoundTrip ? waypoints[0] : waypoints[waypoints.length - 1],
        waypoints,
        effortTolerance: wheelchairAccessible ? 0.2 : effortTolerance,
        safetyStrictness: wheelchairAccessible ? 0.95 : safetyStrictness,
        targetDistanceKm: targetDistanceKm || 5.0,
        isRoundTrip,
        wheelchairAccessible,
      };

      const res = await fetch('/api/routes/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${res.status}: Failed to calculate route`);
      }

      const data: RouteResponse = await res.json();
      const calculatedDuration = parseFloat(
        (data.distanceKm * userPaceMinPerKm + (data.elevationGainM / 100) * 1.5).toFixed(1)
      );

      set({
        activeRoute: data.route,
        elevationProfile: data.elevationProfile,
        distanceKm: data.distanceKm,
        elevationGainM: data.elevationGainM,
        estDurationMin: calculatedDuration,
        hazards: data.hazards,
        isLoadingRoute: false,
      });
    } catch (err: any) {
      set({
        errorMessage: err.message || 'Error communicating with pathfinder service',
        isLoadingRoute: false,
      });
    }
  },

  resetRoute: () => {
    set({
      activeRoute: null,
      elevationProfile: [],
      hoveredDistance: null,
      distanceKm: 0,
      elevationGainM: 0,
      estDurationMin: 0,
      hazards: [],
      errorMessage: null,
    });
  },
}));
