import { Link } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import { CATEGORIES } from '@/lib/categories';

/**
 * /by-part — landing for "ข้อมูลแยกตาม part".
 *
 * Per spec: 2 symbols per row, transparent surface (no chip), no labels.
 * Uses `fullBleed` so the grid stretches the iPhone viewport, with only a
 * small gutter on each side.
 */
export default function ByPartIndexPage() {
  return (
    <AppShell fullBleed>
      <div className="mx-auto w-full max-w-xl">
        <div className="mb-3 flex items-center justify-between">
          <Link to="/" className="text-xs font-medium text-white/90">
            ‹ กลับ
          </Link>
          <div className="w-12" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.code}
              to={`/by-part/${cat.code}`}
              aria-label={cat.titleTh}
              className="flex aspect-square items-center justify-center bg-transparent transition-transform active:scale-95"
            >
              <img
                src={`/icons/categories/cat-${cat.code}.png`}
                alt=""
                loading="lazy"
                decoding="async"
                draggable={false}
                className="h-full w-full object-contain"
              />
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
