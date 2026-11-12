'use client';

import React from 'react';
import Link from 'next/link';
import { Sun, Moon, ShieldCheck, Route as RouteIcon, SlidersHorizontal } from 'lucide-react';
import { AuthWidget } from './AuthWidget';
import { useMapStore } from '@/store/map-store';

interface HeaderProps {
  currentTheme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentTheme = 'dark', onToggleTheme }) => {
  const { setIsOnboardingOpen } = useMapStore();
  return (
    <header className="h-16 border-b border-dark-border/40 bg-dark-surfaceSolid/80 backdrop-blur-glass px-4 md:px-6 flex items-center justify-between z-30 transition-colors">
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-dark-accent/20 border border-dark-accent/40 flex items-center justify-center group-hover:scale-105 transition-transform">
            <RouteIcon className="w-4 h-4 text-dark-accent" />
          </div>
          <span className="font-display font-extrabold text-xl tracking-tight text-dark-metricText">
            Safe<span className="text-dark-accent">Stride</span>
          </span>
        </Link>
      </div>

      <div className="flex items-center gap-2.5">
        <button
          onClick={() => setIsOnboardingOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dark-surface border border-dark-border text-dark-labelText hover:text-white hover:bg-zinc-800 text-xs font-ui font-medium transition-colors cursor-pointer"
          title="Runner Preferences"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-dark-accent" />
          <span className="hidden sm:inline">Preferences</span>
        </button>

        <button
          onClick={onToggleTheme}
          aria-label="Toggle Theme"
          className="p-2 rounded-xl bg-dark-surface border border-dark-border text-dark-labelText hover:text-dark-metricText hover:bg-zinc-800 transition-colors"
        >
          {currentTheme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-300" />
          ) : (
            <Moon className="w-4 h-4 text-indigo-400" />
          )}
        </button>

        {/* Dynamic Clerk / Demo Auth Widget */}
        <AuthWidget />
      </div>
    </header>
  );
};
