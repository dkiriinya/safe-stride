'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { SmoothScrollProvider } from '@/components/landing/SmoothScrollProvider';
import {
  Route as RouteIcon,
  Moon,
  Mountain,
  Compass,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  MapPin,
  Clock,
  Zap,
} from 'lucide-react';

export default function LandingPage() {
  return (
    <SmoothScrollProvider>
      <div className="min-h-screen bg-dark-base text-dark-metricText selection:bg-dark-accent selection:text-black">
        {/* Navigation Bar */}
        <header className="sticky top-0 z-40 w-full border-b border-dark-border/40 bg-dark-surfaceSolid/80 backdrop-blur-glass px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-dark-accent/20 border border-dark-accent/40 flex items-center justify-center group-hover:scale-105 transition-transform">
              <RouteIcon className="w-4 h-4 text-dark-accent" />
            </div>
            <span className="font-display font-extrabold text-xl tracking-tight text-white">
              Safe<span className="text-dark-accent">Stride</span>
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href="/planner"
              className="px-4 py-2 rounded-xl bg-dark-accent hover:bg-dark-accentHover text-black font-display font-bold text-xs tracking-wide shadow-neon-glow flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <span>Open Planner</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </header>

        {/* Hero Section */}
        <section className="relative pt-16 pb-20 px-6 max-w-6xl mx-auto text-center flex flex-col items-center">
          {/* Top Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-dark-accent/10 border border-dark-accent/30 text-dark-accent text-xs font-ui font-semibold mb-6 shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Smarter, Safer Urban Running</span>
          </div>

          {/* Main Headline */}
          <h1 className="font-display font-extrabold text-4xl sm:text-6xl md:text-7xl tracking-tight text-white max-w-4xl leading-[1.08] mb-6">
            Run Where You Feel{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-dark-accent to-emerald-400">
              Safe & Confident
            </span>
          </h1>

          {/* Clean Subtitle */}
          <p className="font-ui font-normal text-base sm:text-lg text-dark-labelText max-w-2xl mb-10 leading-relaxed">
            SafeStride creates custom running loops right from your front door.
            Choose your distance, stick to well-lit sidewalks after dark, and pick routes that fit your pace.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-16 w-full sm:w-auto">
            <Link
              href="/planner"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-dark-accent hover:bg-dark-accentHover text-black font-display font-extrabold text-sm sm:text-base tracking-wide shadow-neon-glow flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <span>Plan Your Run</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#how-it-works"
              className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-dark-surfaceSolid border border-dark-border text-dark-metricText font-ui font-medium text-sm hover:bg-zinc-800 transition-colors"
            >
              How It Works
            </a>
          </div>

          {/* 3D Hero Visual Banner */}
          <div className="w-full rounded-3xl p-3 sm:p-5 bg-gradient-to-b from-dark-border/40 to-transparent border border-dark-border/50 shadow-glass-dark">
            <div className="relative w-full aspect-[16/9] max-h-[540px] rounded-2xl overflow-hidden bg-black border border-dark-border/60 flex items-center justify-center">
              <Image
                src="/images/hero-3d.jpg"
                alt="3D render of a glowing safe urban running route"
                fill
                priority
                className="object-cover object-center"
              />

              {/* Floating Quick Badges */}
              <div className="absolute top-4 left-4 z-10 hidden sm:flex items-center gap-2 p-2.5 rounded-2xl bg-black/70 backdrop-blur-md border border-white/10 shadow-xl">
                <div className="w-7 h-7 rounded-xl bg-amber-400/20 flex items-center justify-center text-amber-300">
                  <Moon className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div className="text-[11px] font-display font-bold text-white">Well-Lit Sidewalks</div>
                  <div className="text-[10px] text-zinc-400">Avoids dark unlit streets</div>
                </div>
              </div>

              <div className="absolute bottom-4 right-4 z-10 hidden sm:flex items-center gap-2 p-2.5 rounded-2xl bg-black/70 backdrop-blur-md border border-white/10 shadow-xl">
                <div className="w-7 h-7 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Compass className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div className="text-[11px] font-display font-bold text-white">Doorstep Closed Loops</div>
                  <div className="text-[10px] text-zinc-400">Always returns to start</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works (Simple 3-Step Strip) */}
        <section id="how-it-works" className="py-16 px-6 max-w-6xl mx-auto border-t border-dark-border/40">
          <div className="text-center max-w-xl mx-auto mb-14">
            <h2 className="font-display font-bold text-2xl sm:text-3xl text-white tracking-tight mb-3">
              Running Made Simple
            </h2>
            <p className="font-ui text-sm text-dark-labelText">
              Three easy steps to discover safe, enjoyable running paths near you.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-3xl bg-dark-surfaceSolid border border-dark-border/50 flex flex-col justify-between">
              <div className="w-10 h-10 rounded-2xl bg-dark-accent/15 border border-dark-accent/30 text-dark-accent font-display font-bold text-sm flex items-center justify-center mb-4">
                1
              </div>
              <h3 className="font-display font-bold text-lg text-white mb-2">
                Set Your Starting Point
              </h3>
              <p className="font-ui text-xs text-dark-labelText leading-relaxed">
                Use your current GPS location or search any neighborhood or address you want to run from.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-dark-surfaceSolid border border-dark-border/50 flex flex-col justify-between">
              <div className="w-10 h-10 rounded-2xl bg-dark-accent/15 border border-dark-accent/30 text-dark-accent font-display font-bold text-sm flex items-center justify-center mb-4">
                2
              </div>
              <h3 className="font-display font-bold text-lg text-white mb-2">
                Choose Distance & Safety
              </h3>
              <p className="font-ui text-xs text-dark-labelText leading-relaxed">
                Pick your distance (3k, 5k, 8k) and tell us if you want well-lit evening streets, flat paths, or hills.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-dark-surfaceSolid border border-dark-border/50 flex flex-col justify-between">
              <div className="w-10 h-10 rounded-2xl bg-dark-accent/15 border border-dark-accent/30 text-dark-accent font-display font-bold text-sm flex items-center justify-center mb-4">
                3
              </div>
              <h3 className="font-display font-bold text-lg text-white mb-2">
                Run Back to Your Door
              </h3>
              <p className="font-ui text-xs text-dark-labelText leading-relaxed">
                Hit the pavement. SafeStride guides you along a complete loop that finishes right at your doorstep.
              </p>
            </div>
          </div>
        </section>

        {/* 3D Features Gallery */}
        <section className="py-20 px-6 max-w-6xl mx-auto border-t border-dark-border/40">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-white tracking-tight mb-4">
              Everything You Need for Peace of Mind
            </h2>
            <p className="font-ui text-sm text-dark-labelText">
              Designed for everyday runners who want safety, clarity, and control.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1: Night Safety with 3D Image */}
            <div className="rounded-3xl bg-dark-surfaceSolid border border-dark-border/50 overflow-hidden flex flex-col shadow-lg hover:border-dark-accent/40 transition-all">
              <div className="relative w-full aspect-[4/3] bg-black">
                <Image
                  src="/images/night-safety-3d.jpg"
                  alt="3D render of well-lit sidewalks and streetlights"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400/10 text-amber-300 text-[11px] font-semibold mb-3">
                    <Moon className="w-3.5 h-3.5" />
                    <span>Night-Safe Running</span>
                  </div>
                  <h3 className="font-display font-bold text-xl text-white mb-2">
                    Well-Lit Sidewalks
                  </h3>
                  <p className="font-ui text-xs text-dark-labelText leading-relaxed">
                    Avoid pitch-black alleys and dark shortcuts. SafeStride maps routes along brightly lit streets and populated pedestrian corridors.
                  </p>
                </div>
              </div>
            </div>

            {/* Feature 2: Elevation & Hills with 3D Image */}
            <div className="rounded-3xl bg-dark-surfaceSolid border border-dark-border/50 overflow-hidden flex flex-col shadow-lg hover:border-dark-accent/40 transition-all">
              <div className="relative w-full aspect-[4/3] bg-black">
                <Image
                  src="/images/elevation-hills-3d.jpg"
                  alt="3D render of rolling green hills with elevation curves"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[11px] font-semibold mb-3">
                    <Mountain className="w-3.5 h-3.5" />
                    <span>Elevation Control</span>
                  </div>
                  <h3 className="font-display font-bold text-xl text-white mb-2">
                    Hills on Your Terms
                  </h3>
                  <p className="font-ui text-xs text-dark-labelText leading-relaxed">
                    Want an easy flat recovery run or a challenging hill workout? Pick your elevation preference and preview the slope before you leave.
                  </p>
                </div>
              </div>
            </div>

            {/* Feature 3: Closed-Loop Doorstep Return */}
            <div className="rounded-3xl bg-dark-surfaceSolid border border-dark-border/50 overflow-hidden flex flex-col shadow-lg hover:border-dark-accent/40 transition-all">
              <div className="relative w-full aspect-[4/3] bg-black">
                <Image
                  src="/images/loop-doorstep.png"
                  alt="Closed loop route returning to start location"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-dark-accent/10 text-dark-accent text-[11px] font-semibold mb-3">
                    <Compass className="w-3.5 h-3.5" />
                    <span>Closed Loops</span>
                  </div>
                  <h3 className="font-display font-bold text-xl text-white mb-2">
                    Doorstep Return
                  </h3>
                  <p className="font-ui text-xs text-dark-labelText leading-relaxed">
                    No boring out-and-back routes. Every route forms a complete loop through the neighborhood and returns right to your doorstep.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Bottom CTA Banner */}
        <section className="py-20 px-6 max-w-4xl mx-auto text-center">
          <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-b from-dark-surfaceSolid to-zinc-950 border border-dark-border/60 shadow-glass-dark flex flex-col items-center">
            <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-white tracking-tight mb-4">
              Ready to Hit the Pavement?
            </h2>
            <p className="font-ui text-sm text-dark-labelText max-w-lg mb-8 leading-relaxed">
              No complicated setup or account needed to get started. Just choose your location and plan your first safe run in seconds.
            </p>
            <Link
              href="/planner"
              className="px-8 py-4 rounded-2xl bg-dark-accent hover:bg-dark-accentHover text-black font-display font-extrabold text-base tracking-wide shadow-neon-glow flex items-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <span>Start Planning Now</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        {/* Clean Footer */}
        <footer className="border-t border-dark-border/40 py-8 px-6 text-center">
          <p className="font-ui text-xs text-dark-labelText">
            SafeStride &copy; {new Date().getFullYear()} &mdash; Smarter, safer running routes for everyone.
          </p>
        </footer>
      </div>
    </SmoothScrollProvider>
  );
}
