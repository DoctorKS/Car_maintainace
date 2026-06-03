import { Link } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import { CATEGORIES } from '@/lib/categories';

/**
 * /by-part — the "ข้อมูลแยกตาม part" landing page.
 *
 * Per spec: only the 6 PNG symbols, transparent background under each, no
 * text labels. Tap a symbol → /by-part/:code drill-in.
 */
export default function ByPartIndexPage() {
  return (
    <AppShell>
      <div className="mb-4 flex items-center justify-between">
        <Link to="/" className="text-xs font-medium text-white/90">
          ‹ กลับ
        </Link>
        <div className="w-12" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        {CATEGORIES.map((cat) => (
          <Link
            key={cat.code}
            to={`/by-part/${cat.code}`}
            aria-label={cat.titleTh}
            className="flex aspect-square items-center justify-center rounded-tile bg-transparent transition-transform active:scale-95"
          >
            <img
              src={`/icons/categories/cat-${cat.code}.png`}
              alt=""
              loading="lazy"
              decoding="async"
              draggable={false}
              className="h-full w-full object-contain p-1"
            />
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
