'use client';

import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { useMapStore } from '@/store/map-store';
import { Mountain, Shield, TrendingUp } from 'lucide-react';

interface ElevationScrubberProps {
  theme?: 'dark' | 'light';
}

export const ElevationScrubber: React.FC<ElevationScrubberProps> = ({ theme = 'dark' }) => {
  const { elevationProfile, hoveredDistance, setHoveredDistance, elevationGainM } = useMapStore();

  if (!elevationProfile || elevationProfile.length === 0) {
    return (
      <div className="h-44 w-full flex flex-col items-center justify-center border border-dashed border-dark-border/60 rounded-2xl p-4 text-center">
        <Mountain className="w-8 h-8 text-dark-labelText/40 mb-2" />
        <p className="font-ui text-xs text-dark-labelText">
          Select two points on the map to generate the telemetry & elevation scrubber.
        </p>
      </div>
    );
  }

  // Calculate min/max elevation for nice bounds
  const elevations = elevationProfile.map((p) => p.elevation);
  const minElev = Math.floor(Math.min(...elevations) / 10) * 10 - 10;
  const maxElev = Math.ceil(Math.max(...elevations) / 10) * 10 + 10;

  const isDark = theme === 'dark';
  const strokeColor = isDark ? '#ccff00' : '#10b981';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
  const textColor = isDark ? '#a1a1aa' : '#64748b';

  return (
    <div className="w-full select-none">
      {/* Scrubber Header telemetry info */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded-md bg-dark-accent/15 border border-dark-accent/30 text-dark-accent">
            <TrendingUp className="w-3.5 h-3.5" />
          </span>
          <span className="font-ui font-medium text-xs text-dark-labelText uppercase tracking-wider">
            Elevation Profile & Grade
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs font-ui">
          <span className="text-dark-labelText">
            Ascent: <strong className="text-dark-metricText font-display font-bold">{elevationGainM} m</strong>
          </span>
          {hoveredDistance !== null && (
            <span className="text-dark-accent font-medium">
              @ {hoveredDistance.toFixed(2)} km
            </span>
          )}
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-40 w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={elevationProfile}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            onMouseMove={(state) => {
              if (state && state.activePayload && state.activePayload.length > 0) {
                const sample = state.activePayload[0].payload;
                setHoveredDistance(sample.distance);
              }
            }}
            onMouseLeave={() => {
              setHoveredDistance(null);
            }}
          >
            <defs>
              <linearGradient id="elevationGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={strokeColor} stopOpacity={0.4} />
                <stop offset="95%" stopColor={strokeColor} stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <XAxis
              dataKey="distance"
              tickLine={false}
              axisLine={{ stroke: gridColor }}
              tick={{ fill: textColor, fontSize: 10, fontFamily: 'var(--font-dm-sans)' }}
              tickFormatter={(v) => `${v}k`}
            />

            <YAxis
              domain={[minElev, maxElev]}
              tickLine={false}
              axisLine={false}
              tick={{ fill: textColor, fontSize: 10, fontFamily: 'var(--font-dm-sans)' }}
              tickFormatter={(v) => `${v}m`}
            />

            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="p-2.5 rounded-xl bg-dark-surfaceSolid/95 backdrop-blur-glass border border-dark-border shadow-glass-dark text-xs font-ui">
                      <div className="font-display font-bold text-dark-metricText mb-1">
                        {data.distance} km
                      </div>
                      <div className="flex items-center justify-between gap-4 text-dark-labelText">
                        <span>Elevation:</span>
                        <strong className="text-dark-metricText font-display font-semibold">{data.elevation} m</strong>
                      </div>
                      <div className="flex items-center justify-between gap-4 text-dark-labelText">
                        <span>Grade:</span>
                        <strong className={data.grade > 4 ? 'text-amber-400 font-semibold' : 'text-dark-metricText font-semibold'}>
                          {data.grade}%
                        </strong>
                      </div>
                      <div className="flex items-center justify-between gap-4 text-dark-labelText">
                        <span>Safety Index:</span>
                        <span className="text-emerald-400 font-medium">{Math.round(data.safetyScore * 100)}%</span>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />

            {hoveredDistance !== null && (
              <ReferenceLine
                x={hoveredDistance}
                stroke="#ffffff"
                strokeDasharray="3 3"
                strokeWidth={1.5}
              />
            )}

            <Area
              type="monotone"
              dataKey="elevation"
              stroke={strokeColor}
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#elevationGrad)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
