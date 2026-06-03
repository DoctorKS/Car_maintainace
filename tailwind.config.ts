import type { Config } from 'tailwindcss';

/**
 * Car Maintenance Tracker — design tokens.
 *
 * The `brand` family is driven by CSS variables so we can swap the whole
 * palette by setting a single body data-attribute. See `src/index.css`:
 *
 *   body                                → Mazda (blue, default)
 *   body[data-vehicle-make="tesla"]     → Tesla (red)
 *
 * Other tokens (ink / sub / line / pink / card) stay static — they're
 * vehicle-agnostic.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: 'rgb(var(--brand-rgb) / <alpha-value>)',
        brandDeep: 'rgb(var(--brand-deep-rgb) / <alpha-value>)',
        brandSoft: 'rgb(var(--brand-soft-rgb) / <alpha-value>)',
        line: '#DBE7F8',
        ink: '#13294D',
        sub: '#7186A3',
        pink: '#EC4D8E',
        card: '#FFFFFF',
      },
      fontFamily: {
        sans: ['"IBM Plex Sans Thai"', '"IBM Plex Sans"', '"Inter"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        tile: '20px',
        card: '22px',
        hero: '26px',
      },
      boxShadow: {
        // Cards now sit flat on the brand background — no glow halo.
        card: 'none',
        soft: 'none',
        // Keep the calendar "today" pill highlight (a brand-tinted glow, not
        // a white one, and it signals the selected day).
        today: '0 6px 14px rgb(var(--brand-rgb) / 0.4)',
      },
      spacing: {
        'safe-t': 'env(safe-area-inset-top)',
        'safe-b': 'env(safe-area-inset-bottom)',
      },
    },
  },
  plugins: [],
} satisfies Config;
