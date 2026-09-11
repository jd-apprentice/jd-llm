/** @type {import('tailwindcss').Config} */
import tailwindcssAnimate from 'tailwindcss-animate'

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Arcade palette
        arcade: {
          pink: '#ff2d9c',
          cyan: '#2df3ff',
          yellow: '#ffe600',
          green: '#23ff6b',
          purple: '#a12dff',
          orange: '#ff8a00',
        },
      },
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
        pixel: ['"Press Start 2P"', 'monospace'],
      },
      keyframes: {
        blink: {
          '0%, 49%': { opacity: '1' },
          '50%, 100%': { opacity: '0' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 6px currentColor' },
          '50%': { boxShadow: '0 0 20px currentColor' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
      animation: {
        blink: 'blink 1s step-end infinite',
        glow: 'glow 2s ease-in-out infinite',
        float: 'float 3s ease-in-out infinite',
      },
      boxShadow: {
        'arcade-pink': '0 0 6px #ff2d9c, 0 0 12px #ff2d9c',
        'arcade-cyan': '0 0 6px #2df3ff, 0 0 12px #2df3ff',
        'arcade-yellow': '0 0 6px #ffe600, 0 0 12px #ffe600',
      },
      backgroundImage: {
        'arcade-gradient': 'linear-gradient(135deg, #2d0b4e 0%, #12071f 50%, #06121f 100%)',
      },
    },
  },
  // Ensure classes used in @apply are not purged
  safelist: ['font-inter'],
  plugins: [
    tailwindcssAnimate,
  ],
}
