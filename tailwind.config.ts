import type { Config } from 'tailwindcss';

/**
 * Car Maintenance Tracker — design tokens
 * โทนฟ้าสด / การ์ดขาว (CARFAX-style)
 *
 * Source of truth: handoff/tailwind.config.ts
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: '#1668CC', // primary blue — พื้นหลังหน้า
        brandDeep: '#0F55AD', // เงา/ความลึก
        brandSoft: '#EAF1FC', // พื้นไอคอน / inner surface
        line: '#DBE7F8', // เส้นขอบ / วันเดือนอื่น
        ink: '#13294D', // หัวข้อบนการ์ดขาว
        sub: '#7186A3', // ข้อความรอง
        pink: '#EC4D8E', // จุด record / ไฮไลต์เล็ก
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
        // Cards now sit flat on the blue background — no glow halo.
        card: 'none',
        soft: 'none',
        // Keep the calendar "today" pill highlight (it's a brand-blue glow,
        // not a white one, and signals the selected day).
        today: '0 6px 14px rgba(22,104,204,.4)',
      },
      spacing: {
        'safe-t': 'env(safe-area-inset-top)',
        'safe-b': 'env(safe-area-inset-bottom)',
      },
    },
  },
  plugins: [],
} satisfies Config;
