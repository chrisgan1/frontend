/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        groove: {
          green: '#1DB954',
          'green-light': '#1ed760',
          bg: '#121212',
          surface: '#181818',
          surface2: '#242424',
          surface3: '#2a2a2a',
          text: '#FFFFFF',
          muted: '#B3B3B3',
          subtle: '#6a6a6a',
        },
      },
    },
  },
  plugins: [],
};
