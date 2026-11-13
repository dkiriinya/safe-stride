'use client';

import React, { useEffect, useRef } from 'react';
import Lenis from 'lenis';

export const SmoothScrollProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    const desktopQuery = window.matchMedia('(min-width: 1024px)');
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frameId: number | null = null;

    const destroyLenis = () => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
        frameId = null;
      }
      if (lenisRef.current) {
        lenisRef.current.destroy();
        lenisRef.current = null;
      }
    };

    const syncLenis = () => {
      const shouldEnable = desktopQuery.matches && !reducedMotionQuery.matches;

      if (!shouldEnable) {
        destroyLenis();
        return;
      }

      if (lenisRef.current) return;

      const lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: 'vertical',
        gestureOrientation: 'vertical',
        smoothWheel: true,
      });

      lenisRef.current = lenis;

      const raf = (time: number) => {
        lenis.raf(time);
        frameId = requestAnimationFrame(raf);
      };

      frameId = requestAnimationFrame(raf);
    };

    syncLenis();
    desktopQuery.addEventListener('change', syncLenis);
    reducedMotionQuery.addEventListener('change', syncLenis);

    return () => {
      desktopQuery.removeEventListener('change', syncLenis);
      reducedMotionQuery.removeEventListener('change', syncLenis);
      destroyLenis();
    };
  }, []);

  return <>{children}</>;
};
