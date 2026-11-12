'use client';

import React, { useEffect, useState } from 'react';
import { Header } from '@/components/common/Header';
import { PlannerPanel } from '@/components/panel/PlannerPanel';
import { DynamicMapCanvas } from '@/components/map/MapCanvas.dynamic';
import { OnboardingModal } from '@/components/onboarding/OnboardingModal';
import { useMapStore } from '@/store/map-store';

export default function PlannerPage() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const { fetchRoute, waypoints, setUserLocation, setIsOnboardingOpen } = useMapStore();

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);

    if (typeof window !== 'undefined') {
      const savedLoc = localStorage.getItem('safestride_user_location');
      if (savedLoc) {
        try {
          const parsed = JSON.parse(savedLoc);
          if (parsed.coords) {
            setUserLocation(parsed.coords, parsed.name);
            return;
          }
        } catch {}
      }

      const hasOnboarded = localStorage.getItem('safestride_onboarded');
      if (!hasOnboarded) {
        setIsOnboardingOpen(true);
      } else if (navigator.geolocation && waypoints.length === 0) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const loc: [number, number] = [pos.coords.latitude, pos.coords.longitude];
            setUserLocation(loc, 'Current GPS Location');
          },
          () => {
            setIsOnboardingOpen(true);
          },
          { timeout: 6000, enableHighAccuracy: true }
        );
      }
    }
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-dark-base text-dark-metricText">
      {/* Top Application Header */}
      <Header currentTheme={theme} onToggleTheme={toggleTheme} />

      {/* Main Workspace Layout */}
      {/* Desktop: Flex row with fixed 420px left sidebar and flex-1 map */}
      {/* Mobile: Map full screen with floating frosted bottom sheet */}
      <main className="flex-1 flex flex-col md:flex-row relative overflow-hidden">
        {/* Left Data & Telemetry Panel */}
        <PlannerPanel theme={theme} />

        {/* Right Map Canvas Container (flex: 1) */}
        <div className="flex-1 relative w-full h-[50vh] md:h-full">
          <DynamicMapCanvas theme={theme} />
        </div>
      </main>

      {/* Onboarding Wizard Modal */}
      <OnboardingModal />
    </div>
  );
}
