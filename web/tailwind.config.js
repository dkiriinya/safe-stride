/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          base: '#09090b',
          surface: 'rgba(24, 24, 27, 0.65)',
          surfaceSolid: '#18181b',
          border: 'rgba(39, 39, 42, 0.7)',
          mapBase: '#12102A',
          accent: '#ccff00',
          accentHover: '#b3e600',
          metricText: '#f4f4f5',
          labelText: '#a1a1aa',
          hazard: '#f43f5e',
        },
        light: {
          base: '#f8f9fa',
          surface: 'rgba(255, 255, 255, 0.85)',
          surfaceSolid: '#ffffff',
          border: 'rgba(226, 232, 240, 0.8)',
          mapBase: '#f8f9fa',
          accent: '#10b981',
          accentHover: '#059669',
          metricText: '#0f172a',
          labelText: '#64748b',
          hazard: '#e11d48',
        },
      },
      fontFamily: {
        display: ['var(--font-plus-jakarta)', 'sans-serif'],
        ui: ['var(--font-dm-sans)', 'sans-serif'],
      },
      backdropBlur: {
        glass: '12px',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'glass-dark': '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 1px 1px rgba(255, 255, 255, 0.08) inset',
        'glass-light': '0 20px 40px rgba(15, 23, 42, 0.08), 0 1px 3px rgba(15, 23, 42, 0.05)',
        'neon-glow': '0 0 20px rgba(204, 255, 0, 0.35)',
      },
    },
  },
  plugins: [],
};
