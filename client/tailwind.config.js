/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        npc: {
          bg:       '#0c0c0c',
          surface:  '#141414',
          surface2: '#1c1c1c',
          surface3: '#242424',
          border:   '#2a2a2a',
          text:     '#f0f0f0',
          muted:    '#888888',
          subtle:   '#555555',
          blend:    '#6b7280',
          break:    '#f59e0b',
          alarm:    '#ef4444',
          escape:   '#22c55e',
          cop:      '#60a5fa',
          crook:    '#fbbf24',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'blink': 'blink 1.2s step-end infinite',
        'scan': 'scan 4s linear infinite',
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
      },
    },
  },
  plugins: [],
};
