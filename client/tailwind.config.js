/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'game-bg': '#1a0a2e',
        'game-card': '#2d1b4e',
        'game-border': '#5c3d8f',
        'game-accent': '#ff6b6b',
        'game-green': '#51cf66',
        'game-yellow': '#ffd43b',
        'game-blue': '#74c0fc',
      },
      fontFamily: {
        game: ['"Fredoka One"', 'cursive'],
        body: ['Nunito', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
