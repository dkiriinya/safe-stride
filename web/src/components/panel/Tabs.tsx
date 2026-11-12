'use client';

import React from 'react';
import { TabKey } from '@/store/map-store';

interface TabsProps {
  activeTab: TabKey;
  onChange: (tab: TabKey) => void;
}

export const Tabs: React.FC<TabsProps> = ({ activeTab, onChange }) => {
  const tabs: { key: TabKey; label: string }[] = [
    { key: 'summary', label: 'SUMMARY' },
    { key: 'stats', label: 'STATS' },
    { key: 'charts', label: 'CHARTS' },
  ];

  return (
    <div className="flex items-center justify-between border-b border-dark-border/60 mb-4 px-1">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`relative pb-2.5 px-2 text-xs font-display font-bold tracking-wider transition-colors focus:outline-none ${
              isActive ? 'text-dark-metricText' : 'text-dark-labelText hover:text-dark-metricText/80'
            }`}
          >
            {tab.label}
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-dark-accent rounded-full shadow-neon-glow" />
            )}
          </button>
        );
      })}
    </div>
  );
};
