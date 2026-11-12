'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Moon, Footprints, ShieldAlert, X, Accessibility, Mountain } from 'lucide-react';
import { Hazard } from '@/contracts/route';

interface HazardMarkerProps {
  hazard: Hazard;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}

export const HazardMarker: React.FC<HazardMarkerProps> = ({
  hazard,
  isOpen,
  onToggle,
  onClose,
}) => {
  const getIcon = () => {
    switch (hazard.kind) {
      case 'unlit':
        return <Moon className="w-3.5 h-3.5 text-amber-400" />;
      case 'no_sidewalk':
        return <Footprints className="w-3.5 h-3.5 text-rose-400" />;
      case 'steep_incline':
        return <Mountain className="w-3.5 h-3.5 text-cyan-400" />;
      case 'stairs':
      case 'curb':
        return <Accessibility className="w-3.5 h-3.5 text-cyan-400" />;
      default:
        return <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />;
    }
  };

  const getBadgeColor = () => {
    switch (hazard.kind) {
      case 'unlit':
        return 'bg-amber-500/20 border-amber-500/40 text-amber-300';
      case 'no_sidewalk':
        return 'bg-rose-500/20 border-rose-500/40 text-rose-300';
      case 'steep_incline':
      case 'stairs':
      case 'curb':
        return 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300';
      default:
        return 'bg-orange-500/20 border-orange-500/40 text-orange-300';
    }
  };

  return (
    <div className="relative select-none pointer-events-auto">
      {/* Glowing Hazard Dot on the Map Route */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        aria-label={`Hazard: ${hazard.description}`}
        className="relative group flex items-center justify-center cursor-pointer transition-transform hover:scale-125 focus:outline-none"
      >
        <span className="absolute w-5 h-5 rounded-full bg-rose-500/30 hazard-pulse-marker" />
        <span className="relative flex items-center justify-center w-4 h-4 rounded-full bg-rose-600 border border-white/80 shadow-md">
          <AlertTriangle className="w-2.5 h-2.5 text-white" />
        </span>
      </button>

      {/* Framer Motion Pop-up Card Tooltip */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -4 }}
            transition={{ type: 'spring', damping: 22, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className="absolute left-1/2 bottom-full mb-3 -translate-x-1/2 w-64 p-3 rounded-2xl bg-dark-surfaceSolid/95 backdrop-blur-glass border border-dark-border shadow-glass-dark z-50 text-left pointer-events-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-dark-border/40">
              <div className="flex items-center gap-1.5">
                <span className={`p-1 rounded-md border ${getBadgeColor()}`}>
                  {getIcon()}
                </span>
                <span className="font-ui font-medium text-xs text-dark-metricText capitalize">
                  {hazard.kind.replace('_', ' ')} Warning
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="text-dark-labelText hover:text-white p-0.5 rounded transition-colors"
                aria-label="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Description in DM Sans */}
            <p className="font-ui font-normal text-xs text-dark-metricText/90 leading-relaxed mb-2">
              {hazard.description}
            </p>

            {/* Microcopy telemetry specs */}
            <div className="flex items-center justify-between text-[11px] font-ui text-dark-labelText pt-1 border-t border-dark-border/30">
              <span>At km {hazard.distanceKm}</span>
              <span className="text-amber-400 font-medium">Caution advised</span>
            </div>

            {/* Arrow pointer */}
            <div className="absolute left-1/2 top-full -translate-x-1/2 w-0 h-0 border-x-6 border-x-transparent border-t-6 border-t-dark-surfaceSolid/95" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
