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
        <div className="text-sm text-white/70">ไม่พบหมวด</div>
      </AppShell>
    );
  }

  const cat = getCategory(code);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const groups = useByPart(userId, code);

  return (
    <AppShell>
      <div className="mb-3 flex items-center justify-between">
        <Link to="/" className="text-xs text-white/70">
          ‹ กลับ
        </Link>
        <div className="flex items-center gap-2">
          <CategoryIcon code={code} className="h-5 w-5" />
          <h1 className="text-sm font-semibold">หมวด {code}: {cat.titleTh}</h1>
        </div>
        <div className="w-12" />
      </div>

      <div className="rounded-card bg-primary-700 p-3 shadow-card">
        {groups.length === 0 && (
          <div className="py-8 text-center text-xs text-white/60">
            ยังไม่มีบันทึกในหมวดนี้
          </div>
        )}
        <div className="space-y-2">
          {groups.map((g) => {
            const isOpen = expanded.has(g.partName);
            return (
              <div key={g.partName} className="rounded-sub bg-primary-800 shadow-sub">
                <button
                  type="button"
                  onClick={() => toggle(g.partName)}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{g.partName}</div>
                    <div className="text-[10px] text-white/60">
                      เปลี่ยน {g.count} ครั้ง · รวม ฿ {baht(g.totalSpent)}
                    </div>
                  </div>
                  <span className="text-base">{isOpen ? '▾' : '▸'}</span>
                </button>
                {isOpen && (
                  <div className="border-t border-white/5 px-3 pb-2 pt-1">
                    {g.entries.map((e) => (
                      <div
                        key={e.visitId + e.serviceDate}
                        className="flex items-center justify-between py-1.5 text-xs"
                      >
                        <span className="text-white/85">
                          {formatThaiMedium(fromLocalIsoDate(e.serviceDate))}
                          {e.quantity !== 1 && (
                            <span className="ml-1 text-white/50">×{e.quantity}</span>
                          )}
                        </span>
                        <span className="font-semibold">฿ {baht(e.totalPrice)}</span>
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
