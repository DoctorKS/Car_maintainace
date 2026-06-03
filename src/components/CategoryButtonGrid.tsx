import { Link } from 'react-router-dom';
import { CATEGORIES } from '@/lib/categories';
import CategoryIcon from './CategoryIcon';

/**
 * 6 interactive buttons (3×2 grid) — one per maintenance category.
 * Route: /by-part/:code
 */
export default function CategoryButtonGrid() {
  return (
    <div className="grid grid-cols-3 gap-3">
      {CATEGORIES.map((cat) => (
        <Link
          key={cat.code}
          to={`/by-part/${cat.code}`}
          className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-card bg-primary-700 p-2 text-white shadow-sub transition-transform active:scale-95"
        >
          <CategoryIcon code={cat.code} className="h-7 w-7" />
          <div className="text-center text-[11px] font-medium leading-tight">{cat.titleTh}</div>
        </Link>
      ))}
    </div>
  );
}
