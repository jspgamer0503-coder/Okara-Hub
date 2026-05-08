/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        nd: {
          bg: '#0f0f14',
          panel: '#16161f',
          bar: '#1b1b27',
          row: '#1f1f2e',
          border: '#2a2a3d',
          accent: '#7c3aed',
          'accent-light': '#8b5cf6',
          muted: '#6b7280',
          text: '#e2e8f0',
          'text-dim': '#94a3b8',
        }
      },
    },
  },
  plugins: [],
};
