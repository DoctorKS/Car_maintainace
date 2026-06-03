import { Link } from 'react-router-dom';
import { CATEGORIES } from '@/lib/categories';
import CategoryIcon from './CategoryIcon';

/**
 * 6 interactive tiles (3×2 grid) — one per maintenance category.
 * White card on the blue page; PNG icon centered in a soft chip.
 * Tap → /by-part/:code
 */
export default function CategoryButtonGrid() {
  return (
    <div className="grid grid-cols-3 gap-3">
      {CATEGORIES.map((cat) => (
        <Link
          key={cat.code}
          to={`/by-part/${cat.code}`}
          className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-tile bg-card p-2 shadow-soft transition-transform active:scale-95"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brandSoft">
            <CategoryIcon code={cat.code} className="h-10 w-10" />
          </div>
          <div className="text-center text-[11px] font-medium leading-tight text-ink">
            {cat.titleTh}
          </div>
        </Link>
      ))}
    </div>
  );
}
