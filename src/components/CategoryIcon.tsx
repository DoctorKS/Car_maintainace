import type { CategoryCode } from '@/lib/categories';

interface Props {
  code: CategoryCode;
  className?: string;
}

/**
 * Inline SVG glyphs for the 6 categories. Stroke-based, monochrome — pick up
 * the current text color via `currentColor`.
 *
 * Replaceable by user-supplied PNG/SVG assets later — see the plan's
 * open-issue #1.
 */
export default function CategoryIcon({ code, className }: Props) {
  const cls = `h-8 w-8 ${className ?? ''}`;
  const stroke = { stroke: 'currentColor', strokeWidth: 1.7, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

  switch (code) {
    case 1: // Fluids — oil drop
      return (
        <svg viewBox="0 0 24 24" className={cls} {...stroke}>
          <path d="M12 3 C 8 9, 6 12, 6 15.5 a 6 6 0 0 0 12 0 C 18 12, 16 9, 12 3 Z" />
          <path d="M9.5 15.5 a 2.5 2.5 0 0 0 2.5 2.5" />
        </svg>
      );
    case 2: // Filter / air intake — funnel + arrows
      return (
        <svg viewBox="0 0 24 24" className={cls} {...stroke}>
          <path d="M4 5 h16 l-6 8 v6 l-4 -2 v-4 Z" />
          <path d="M2 9 h3 M2 12 h3 M2 15 h3" />
        </svg>
      );
    case 3: // Engine / electrical — lightning bolt
      return (
        <svg viewBox="0 0 24 24" className={cls} {...stroke}>
          <path d="M13 2 L4 14 h6 l-1 8 l9 -12 h-6 z" />
        </svg>
      );
    case 4: // Chassis / brakes / tires — caliper around wheel
      return (
        <svg viewBox="0 0 24 24" className={cls} {...stroke}>
          <circle cx="12" cy="12" r="7" />
          <circle cx="12" cy="12" r="3" />
          <path d="M4 8 a 8 8 0 0 0 0 8" />
          <path d="M20 8 a 8 8 0 0 1 0 8" />
        </svg>
      );
    case 5: // Consumables — wiper blade
      return (
        <svg viewBox="0 0 24 24" className={cls} {...stroke}>
          <path d="M4 20 L14 5" />
          <path d="M3 19 l3 -2 l3 4" />
          <path d="M16 4 a 2 2 0 1 1 -4 -2 a 2 2 0 0 1 4 2" />
        </svg>
      );
    case 6: // Others — three-dot box
      return (
        <svg viewBox="0 0 24 24" className={cls} {...stroke}>
          <rect x="3" y="5" width="18" height="14" rx="2.5" />
          <circle cx="9" cy="12" r="1" fill="currentColor" />
          <circle cx="12" cy="12" r="1" fill="currentColor" />
          <circle cx="15" cy="12" r="1" fill="currentColor" />
        </svg>
      );
  }
}
