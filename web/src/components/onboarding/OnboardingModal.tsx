'use client';

import React, { useState, useEffect } from 'react';
import { useMapStore } from '@/store/map-store';
import { useUser, SignInButton } from '@clerk/nextjs';
import {
  Moon,
  Footprints,
  Mountain,
  Zap,
  MapPin,
  Compass,
  ArrowRight,
  ArrowLeft,
  Check,
  X,
  Sparkles,
  UserCheck,
  Clock,
  ShieldCheck,
  Loader2,
} from 'lucide-react';

interface LocationResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  distanceKm?: number;
}

export const OnboardingModal: React.FC = () => {
  const {
    isOnboardingOpen,
    setIsOnboardingOpen,
    applyOnboardingPreferences,
    userLocation,
    userLocationName,
    setUserLocation,
  } = useMapStore();
  const { isSignedIn, user } = useUser();

  const [step, setStep] = useState<number>(1);
  const [goal, setGoal] = useState<'night' | 'fitness' | 'hills' | 'flat'>('night');
  const [pace, setPace] = useState<number>(5.5);
  const [distanceKm, setDistanceKm] = useState<number>(5.0);
  const [locationName, setLocationName] = useState<string>(userLocationName || '');
  const [coords, setCoords] = useState<[number, number] | null>(userLocation || null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<LocationResult[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Check if first-time user
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasOnboarded = localStorage.getItem('safestride_onboarded');
      const savedLoc = localStorage.getItem('safestride_user_location');

      if (savedLoc) {
        try {
          const parsed = JSON.parse(savedLoc);
          if (parsed.coords) {
            setCoords(parsed.coords);
            setLocationName(parsed.name || 'Saved Location');
          }
        } catch {}
      }

      if (!hasOnboarded) {
        setIsOnboardingOpen(true);
      }
    }
  }, [setIsOnboardingOpen]);

  if (!isOnboardingOpen) return null;

  const handleUseGps = () => {
    if (!navigator.geolocation) {
      alert('Location services are not supported by your browser.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const newCoords: [number, number] = [lat, lng];
        const newName = `My Location (${lat.toFixed(3)}, ${lng.toFixed(3)})`;
        setCoords(newCoords);
        setLocationName(newName);
        setUserLocation(newCoords, newName);
      },
      () => {
        setIsLocating(false);
        alert('Could not access GPS. Please type your city or street in the search box.');
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // Proximity helper (haversine)
  const haversineDistKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.sqrt(a));
  };

  const handleSearchPlaces = async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 3) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const refLat = coords ? coords[0] : (userLocation ? userLocation[0] : -1.282);
      const refLon = coords ? coords[1] : (userLocation ? userLocation[1] : 36.82);
      const minLon = (refLon - 1.2).toFixed(4);
      const maxLon = (refLon + 1.2).toFixed(4);
      const minLat = (refLat - 1.2).toFixed(4);
      const maxLat = (refLat + 1.2).toFixed(4);

      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        query
      )}&limit=8&viewbox=${minLon},${maxLat},${maxLon},${minLat}&bounded=0`;

      const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
      if (res.ok) {
        const data: LocationResult[] = await res.json();
        const withDist = data.map((item) => {
          const lat = parseFloat(item.lat);
          const lon = parseFloat(item.lon);
          const d = haversineDistKm(refLat, refLon, lat, lon);
          return { ...item, distanceKm: parseFloat(d.toFixed(1)) };
        });
        withDist.sort((a, b) => (a.distanceKm ?? 99999) - (b.distanceKm ?? 99999));
        setSearchResults(withDist);
      }
    } catch {
      // Ignore network errors
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectLocation = (result: LocationResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const newCoords: [number, number] = [lat, lng];
    const newName = result.display_name.split(',').slice(0, 2).join(', ');
    setCoords(newCoords);
    setLocationName(newName);
    setUserLocation(newCoords, newName);
    setSearchResults([]);
    setSearchQuery('');
  };

  const handleComplete = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('safestride_onboarded', 'true');
    }
    const finalCoords = coords || userLocation || [-29.8350, 31.0180];
    applyOnboardingPreferences({
      goal,
      pace,
      distanceKm,
      startCoords: finalCoords,
    });
  };

  const handleDismiss = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('safestride_onboarded', 'true');
    }
    setIsOnboardingOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-3xl bg-dark-surfaceSolid border border-dark-border/60 shadow-glass-dark overflow-hidden flex flex-col">
        {/* Header Bar */}
        <div className="p-6 pb-4 border-b border-dark-border/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-dark-accent/20 border border-dark-accent/40 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-dark-accent" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg text-white">Welcome to SafeStride</h2>
              <p className="font-ui text-xs text-dark-labelText">
                Quick Setup · Step {step} of 4
              </p>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-lg text-dark-labelText hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Skip setup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Tracker */}
        <div className="w-full bg-zinc-900 h-1">
          <div
            className="bg-dark-accent h-1 transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        {/* Content Area */}
        <div className="p-6 flex-1 min-h-[340px] flex flex-col justify-between">
          {/* STEP 1: Starting Location FIRST */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="font-display font-extrabold text-xl text-white mb-1">
                  Where are you running from?
                </h3>
                <p className="font-ui text-xs text-dark-labelText">
                  We use your location to build closed-loop routes that start and return right to your doorstep.
                </p>
              </div>

              {/* GPS Button */}
              <button
                type="button"
                onClick={handleUseGps}
                disabled={isLocating}
                className="w-full py-3.5 px-4 rounded-2xl bg-dark-accent hover:bg-dark-accentHover text-black font-display font-bold text-sm flex items-center justify-center gap-2 shadow-neon-glow transition-all cursor-pointer"
              >
                {isLocating ? (
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                ) : (
                  <Compass className="w-4 h-4 text-black" />
                )}
                <span>{coords ? 'Update GPS Location' : 'Use My Current Location (GPS)'}</span>
              </button>

              {/* Search or Custom Input */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Or search your city, suburb, or address..."
                  value={searchQuery}
                  onChange={(e) => handleSearchPlaces(e.target.value)}
                  className="w-full py-3 px-3.5 rounded-xl bg-dark-surface border border-dark-border/60 text-white text-xs placeholder:text-dark-labelText/50 focus:outline-none focus:border-dark-accent focus:ring-1 focus:ring-dark-accent"
                />
                {isSearching && (
                  <Loader2 className="absolute right-3.5 top-3 w-4 h-4 text-dark-accent animate-spin" />
                )}

                {/* Search Dropdown */}
                {searchResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 rounded-xl bg-dark-surfaceSolid border border-dark-border shadow-xl z-20 overflow-hidden">
                    {searchResults.map((res) => (
                      <button
                        key={res.place_id}
                        type="button"
                        onClick={() => handleSelectLocation(res)}
                        className="w-full px-3.5 py-2.5 text-left text-xs text-dark-metricText hover:bg-zinc-800 flex items-center justify-between gap-2 border-b border-dark-border/30 last:border-0 cursor-pointer"
                      >
                        <div className="flex items-center gap-2 overflow-hidden flex-1">
                          <MapPin className="w-3.5 h-3.5 text-dark-accent shrink-0" />
                          <span className="truncate">{res.display_name}</span>
                        </div>
                        {typeof res.distanceKm === 'number' && (
                          <span className="text-[10px] text-zinc-400 font-mono shrink-0">
                            {res.distanceKm < 1 ? `${Math.round(res.distanceKm * 1000)}m away` : `${res.distanceKm} km away`}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Current Active Location Display */}
              <div className="p-3.5 rounded-2xl bg-dark-surface border border-dark-border/40 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${coords ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}`}>
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="overflow-hidden">
                  <div className="font-ui text-[11px] text-dark-labelText">
                    {coords ? 'Selected Starting Origin:' : 'No location chosen yet:'}
                  </div>
                  <div className="font-display font-semibold text-xs text-white truncate">
                    {locationName || 'Please click GPS or search your city above'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Running Goal */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="font-display font-extrabold text-xl text-white mb-1">
                  What is your primary running goal?
                </h3>
                <p className="font-ui text-xs text-dark-labelText">
                  We customize streetlights, elevation, and sidewalks to match how you run.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {[
                  {
                    id: 'night',
                    title: 'Night & Safe Running',
                    desc: 'Prioritizes bright streetlights and populated sidewalks.',
                    icon: Moon,
                    highlight: 'text-amber-300',
                  },
                  {
                    id: 'fitness',
                    title: 'Everyday Fitness',
                    desc: 'Relaxed neighbourhood loops with balanced elevation.',
                    icon: Footprints,
                    highlight: 'text-emerald-400',
                  },
                  {
                    id: 'hills',
                    title: 'Hill Workout',
                    desc: 'Embraces steep inclines for strength and calorie burn.',
                    icon: Mountain,
                    highlight: 'text-orange-400',
                  },
                  {
                    id: 'flat',
                    title: 'Flat & Fast Pace',
                    desc: 'Strictly avoids punishing hills for uninterrupted rhythm.',
                    icon: Zap,
                    highlight: 'text-dark-accent',
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = goal === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setGoal(item.id as any)}
                      className={`p-4 rounded-2xl border text-left flex flex-col justify-between gap-3 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-dark-accent/15 border-dark-accent ring-1 ring-dark-accent shadow-neon-glow'
                          : 'bg-dark-surface/50 border-dark-border/60 hover:bg-zinc-800/80 hover:border-dark-border'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                            isSelected ? 'bg-dark-accent/20' : 'bg-zinc-800'
                          }`}
                        >
                          <Icon className={`w-5 h-5 ${item.highlight}`} />
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-dark-accent" />}
                      </div>
                      <div>
                        <div className="font-display font-bold text-sm text-white mb-1">
                          {item.title}
                        </div>
                        <div className="font-ui text-[11px] text-dark-labelText leading-relaxed">
                          {item.desc}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: Pace & Distance */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h3 className="font-display font-extrabold text-xl text-white mb-1">
                  How do you like to run?
                </h3>
                <p className="font-ui text-xs text-dark-labelText">
                  Select your typical pace and target distance for accurate running times.
                </p>
              </div>

              {/* Target Pace */}
              <div>
                <label className="block font-ui text-xs font-semibold text-white mb-2">
                  Typical Running Pace
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { label: 'Easy', pace: 6.5, time: '6:30 / km' },
                    { label: 'Steady', pace: 5.5, time: '5:30 / km' },
                    { label: 'Tempo', pace: 4.75, time: '4:45 / km' },
                    { label: 'Fast', pace: 4.25, time: '4:15 / km' },
                  ].map((p) => {
                    const isSelected = pace === p.pace;
                    return (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => setPace(p.pace)}
                        className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-dark-accent text-black border-dark-accent font-bold shadow-neon-glow'
                            : 'bg-dark-surface border-dark-border/60 text-dark-labelText hover:bg-zinc-800'
                        }`}
                      >
                        <div className="text-xs font-display">{p.label}</div>
                        <div className="text-[10px] opacity-80">{p.time}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Target Distance */}
              <div>
                <label className="block font-ui text-xs font-semibold text-white mb-2">
                  Target Distance
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[3.0, 5.0, 8.0, 10.0].map((dist) => {
                    const isSelected = distanceKm === dist;
                    return (
                      <button
                        key={dist}
                        type="button"
                        onClick={() => setDistanceKm(dist)}
                        className={`py-3 px-2 rounded-xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-dark-accent text-black border-dark-accent font-bold shadow-neon-glow'
                            : 'bg-dark-surface border-dark-border/60 text-dark-labelText hover:bg-zinc-800'
                        }`}
                      >
                        <div className="text-sm font-display">{dist} km</div>
                        <div className="text-[10px] opacity-80">
                          {dist === 3 ? 'Quick' : dist === 5 ? 'Classic' : dist === 8 ? 'Long' : 'Endurance'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Save & Sign In */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h3 className="font-display font-extrabold text-xl text-white mb-1">
                  Save your routes across devices
                </h3>
                <p className="font-ui text-xs text-dark-labelText">
                  Sign in to keep your running routes, access them on mobile, and monitor elevation.
                </p>
              </div>

              {isSignedIn ? (
                <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <UserCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-display font-bold text-sm text-white">
                      Signed in as {user?.firstName || user?.fullName || 'Runner'}
                    </div>
                    <div className="font-ui text-xs text-emerald-400">
                      Your preferences and routes will save to your profile.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 pt-2">
                  <SignInButton mode="modal">
                    <button
                      type="button"
                      className="w-full py-3 px-4 rounded-2xl bg-dark-accent hover:bg-dark-accentHover text-black font-display font-extrabold text-sm tracking-wide shadow-neon-glow flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Sign In / Create Account</span>
                    </button>
                  </SignInButton>

                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-dark-border/40" />
                    <span className="font-ui text-[11px] text-dark-labelText uppercase tracking-wider">
                      or
                    </span>
                    <div className="flex-1 h-px bg-dark-border/40" />
                  </div>

                  <button
                    type="button"
                    onClick={handleComplete}
                    className="w-full py-3 px-4 rounded-2xl bg-dark-surface border border-dark-border text-dark-metricText hover:bg-zinc-800 font-ui font-semibold text-xs tracking-wide flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>Continue as Guest (No Account Required)</span>
                  </button>
                </div>
              )}

              <div className="p-3.5 rounded-2xl bg-dark-surface/40 border border-dark-border/30 flex items-center gap-3 text-dark-labelText text-[11px]">
                <Clock className="w-4 h-4 text-dark-accent shrink-0" />
                <span>
                  Setup ready: {locationName || 'GPS Location'} · {goal === 'night' ? 'Night Safe' : goal === 'hills' ? 'Hill Workout' : goal === 'flat' ? 'Flat & Fast' : 'Fitness'} · {pace === 6.5 ? '6:30' : pace === 5.5 ? '5:30' : pace === 4.75 ? '4:45' : '4:15'}/km.
                </span>
              </div>
            </div>
          )}

          {/* Bottom Navigation Buttons */}
          <div className="pt-6 border-t border-dark-border/40 flex items-center justify-between">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="px-4 py-2.5 rounded-xl border border-dark-border text-dark-labelText hover:text-white hover:bg-zinc-800 font-ui text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleDismiss}
                className="px-4 py-2.5 text-dark-labelText hover:text-white font-ui text-xs transition-colors cursor-pointer"
              >
                Skip
              </button>
            )}

            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className="px-6 py-2.5 rounded-xl bg-dark-accent text-black font-display font-bold text-xs tracking-wide shadow-neon-glow flex items-center gap-1.5 hover:bg-dark-accentHover transition-all cursor-pointer"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleComplete}
                className="px-6 py-2.5 rounded-xl bg-dark-accent text-black font-display font-bold text-xs tracking-wide shadow-neon-glow flex items-center gap-1.5 hover:bg-dark-accentHover transition-all cursor-pointer"
              >
                <span>Start Planning Routes</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
