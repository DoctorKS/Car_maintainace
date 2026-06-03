import type { CategoryCode } from '@/lib/categories';

interface Props {
  code: CategoryCode;
  className?: string;
}

/**
 * Category icon — uses the user-supplied PNGs in `public/icons/categories/`.
 *
 * Mapping (code → original file in /Button/):
 *   1 → fluid.png        (Fluids & Lubricants)
 *   2 → filter.png       (Filters & Emission System)
 *   3 → electric.png     (Engine & Electrical)
 *   4 → Gears.png        (Chassis, Brakes & Tires)
 *   5 → Consumables.png  (General Consumables)
 *   6 → other.png        (Others)
 */
export default function CategoryIcon({ code, className }: Props) {
  return (
    <img
      src={`/icons/categories/cat-${code}.png`}
      alt=""
      loading="lazy"
      decoding="async"
      draggable={false}
      className={`object-contain ${className ?? 'h-10 w-10'}`}
    />
  );
}
