import { Link, useParams } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import CategoryIcon from '@/components/CategoryIcon';
import { useSession } from '@/lib/supabase/session';
import { useByPart } from '@/hooks/useByPart';
import { getCategory, isCategoryCode } from '@/lib/categories';
import { useUiStore } from '@/store/ui';
import { formatThaiMedium, fromLocalIsoDate } from '@/lib/thai-date';

const baht = (n: number) => n.toLocaleString('th-TH');

export default function ByPartPage() {
  const session = useSession();
  const userId = session?.user.id;
  const { code: rawCode } = useParams<{ code: string }>();
  const code = Number(rawCode);
  const expanded = useUiStore((s) => s.expandedParts);
  const toggle = useUiStore((s) => s.toggleExpandedPart);

  if (!isCategoryCode(code)) {
    return (
      <AppShell>
        <div className="rounded-card bg-card p-4 text-sm text-sub shadow-soft">ไม่พบหมวด</div>
      </AppShell>
    );
  }

  const cat = getCategory(code);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const groups = useByPart(userId, code);

  return (
    <AppShell>
      <div className="mb-3 flex items-center justify-between">
        <Link to="/" className="text-xs font-medium text-white/90">
          ‹ กลับ
        </Link>
        <div className="flex items-center gap-2">
          <CategoryIcon code={code} className="h-6 w-6" />
          <h1 className="text-sm font-semibold text-white">
            หมวด {code}: {cat.titleTh}
          </h1>
        </div>
        <div className="w-12" />
      </div>

      <div className="rounded-card bg-card p-3 shadow-card">
        {groups.length === 0 && (
          <div className="py-8 text-center text-xs text-sub">ยังไม่มีบันทึกในหมวดนี้</div>
        )}
        <div className="space-y-2">
          {groups.map((g) => {
            const isOpen = expanded.has(g.partName);
            return (
              <div key={g.partName} className="rounded-tile bg-brandSoft">
                <button
                  type="button"
                  onClick={() => toggle(g.partName)}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-ink">{g.partName}</div>
                    <div className="text-[10px] text-sub">
                      เปลี่ยน {g.count} ครั้ง · รวม ฿ {baht(g.totalSpent)}
                    </div>
                  </div>
                  <span className="text-base text-brand">{isOpen ? '▾' : '▸'}</span>
                </button>
                {isOpen && (
                  <div className="border-t border-line/70 px-3 pb-2 pt-1">
                    {g.entries.map((e) => (
                      <div
                        key={e.visitId + e.serviceDate}
                        className="flex items-center justify-between py-1.5 text-xs"
                      >
                        <span className="text-ink">
                          {formatThaiMedium(fromLocalIsoDate(e.serviceDate))}
                          {e.quantity !== 1 && (
                            <span className="ml-1 text-sub">×{e.quantity}</span>
                          )}
                        </span>
                        <span className="font-semibold text-ink">฿ {baht(e.totalPrice)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
