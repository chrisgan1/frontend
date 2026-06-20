/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        dream: {
          bg: '#0d0a1a',
          surface: '#1a1429',
          accent: '#7c3aed',
          teal: '#06b6d4',
          red: '#dc2626',
          gold: '#f59e0b',
          text: '#f3e8ff',
          muted: '#a78bfa',
        },
      },
    },
  },
  plugins: [],
};
