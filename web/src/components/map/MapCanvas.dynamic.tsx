'use client';

import dynamic from 'next/dynamic';
import React from 'react';

export const DynamicMapCanvas = dynamic(
  () => import('./MapCanvas').then((mod) => mod.MapCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[400px] flex-1 bg-dark-mapBase flex flex-col items-center justify-center text-dark-labelText">
        <div className="w-8 h-8 border-2 border-dark-accent border-t-transparent rounded-full animate-spin mb-3" />
        <span className="font-ui text-xs">Initializing MapLibre GL Canvas...</span>
      </div>
    ),
  }
);
