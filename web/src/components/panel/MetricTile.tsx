'use client';

import React from 'react';

interface MetricTileProps {
  icon: React.ReactNode;
  value: string | number;
  unit?: string;
  label: string;
  badge?: string;
}

export const MetricTile: React.FC<MetricTileProps> = ({
  icon,
  value,
  unit,
  label,
  badge,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl bg-dark-surface/80 border border-dark-border/40 hover:border-dark-border transition-all">
      <div className="relative mb-2">
        <div className="text-dark-metricText/90">{icon}</div>
        {badge && (
          <span className="absolute -top-1.5 -right-5 px-1.5 py-0.2 rounded-full text-[9px] font-ui font-semibold bg-zinc-700 text-zinc-200">
            {badge}
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-1">
        <span className="font-display font-extrabold text-xl sm:text-2xl text-dark-metricText tracking-tight">
          {value}
        </span>
        {unit && (
          <span className="font-display font-semibold text-xs sm:text-sm text-dark-labelText">
            {unit}
          </span>
        )}
      </div>

      <span className="font-ui font-normal text-xs text-dark-labelText mt-0.5">
        {label}
      </span>
    </div>
  );
};
