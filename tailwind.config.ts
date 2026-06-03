import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#E8F0FA',
          100: '#CCDDF3',
          200: '#9BBCE7',
          300: '#5E92D7',
          400: '#1E6FC4',
          500: '#0F65BF',
          600: '#0E68C9',
          700: '#0B5FBF', // card bg (matches screenshot)
          800: '#084D9C', // sub-card (slightly darker)
          900: '#062F66', // page bg / status bar
          950: '#031A3D',
        },
        accent: {
          red: '#FF4D4F',
          gold: '#F5C24C',
        },
      },
      fontFamily: {
        sans: [
          '"Inter Variable"',
          '"Inter"',
          '"IBM Plex Sans Thai"',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'sans-serif',
        ],
        thai: ['"IBM Plex Sans Thai"', 'sans-serif'],
        display: ['"Inter Variable"', '"Inter"', '"IBM Plex Sans Thai"', 'sans-serif'],
      },
      borderRadius: {
        card: '1.25rem',
        sub: '0.875rem',
      },
      boxShadow: {
        card: '0 6px 18px rgba(0,0,0,0.25)',
        sub: '0 2px 8px rgba(0,0,0,0.18)',
      },
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
      },
    },
  },
  plugins: [],
} satisfies Config;
