import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import ThaiDatePicker from '@/components/ThaiDatePicker';
import ServiceCenterDropdown from '@/components/ServiceCenterDropdown';
import CategorySection from '@/components/CategorySection';
import Spinner from '@/components/Spinner';
import { CATEGORIES, isCategoryCode, type CategoryCode } from '@/lib/categories';
import { useSession } from '@/lib/supabase/session';
import { useVehicle } from '@/hooks/useVehicle';
import { useVisitWithItems } from '@/hooks/useMaintenanceVisits';
import { compressImage } from '@/lib/image';
import { deleteVisit, insertVisit, updateVisit } from '@/lib/sync/repository';
import { fromLocalIsoDate, toLocalIsoDate } from '@/lib/thai-date';
import { breakdown } from '@/lib/vat';
import type { DraftItem } from '@/types/domain';

const emptyRows = (): Record<CategoryCode, DraftItem[]> => ({
  1: [],
  2: [],
  3: [],
  4: [],
  5: [],
  6: [],
  7: [],
});

/**
 * Shared form for /add and /edit/:visitId.
 *
 * - /add               → empty form, calls repository.insertVisit
 * - /edit/:visitId     → pre-filled from Dexie, calls repository.updateVisit
 *
 * Either way, the page commits through the offline repository façade so all
 * other surfaces (dashboard recent list, history calendar, by-part timeline)
 * pick up the change via useLiveQuery.
 */
export default function AddMaintenancePage() {
  const session = useSession();
  const userId = session?.user.id;
  const vehicle = useVehicle(userId);
  const navigate = useNavigate();
  const { visitId } = useParams<{ visitId?: string }>();
  const editing = Boolean(visitId);
  const existing = useVisitWithItems(visitId);

  const [date, setDate] = useState<Date | null>(editing ? null : new Date());
  const [mileage, setMileage] = useState<number>(0);
  const [centerId, setCenterId] = useState<string | null>(null);
  const [rows, setRows] = useState<Record<CategoryCode, DraftItem[]>>(emptyRows);
  const [receipt, setReceipt] = useState<{ blob: Blob; mime: string; previewUrl: string } | null>(
    null,
  );
  const [keepExistingReceiptPath, setKeepExistingReceiptPath] = useState<string | null>(null);
  const [visitNotes, setVisitNotes] = useState<string>('');
  const [isScheduled, setIsScheduled] = useState<boolean>(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset hydration flags when the route param changes so navigating
  // /add → /edit/X → /edit/Y (without a full reload) re-seeds the form
  // for the new target instead of clinging to the previous one. This
  // was a real "ข้อมูลไม่ขึ้น" symptom when tapping the pencil on
  // consecutive cards.
  const seededFromVehicle = useRef(false);
  const seededFromExisting = useRef(false);
  useEffect(() => {
    seededFromVehicle.current = false;
    seededFromExisting.current = false;
  }, [visitId]);

  // First-render only: default mileage from the vehicle when adding.
  useEffect(() => {
    if (editing) return;
    if (seededFromVehicle.current || !vehicle) return;
    setMileage(vehicle.mileage);
    seededFromVehicle.current = true;
  }, [editing, vehicle]);

  // First-render only: hydrate from an existing visit when editing.
  // The ref is reset above whenever visitId changes.
  useEffect(() => {
    if (!editing || seededFromExisting.current || !existing) return;
    setDate(fromLocalIsoDate(existing.service_date));
    setMileage(existing.mileage);
    setCenterId(existing.service_center_id);
    setKeepExistingReceiptPath(existing.receipt_image_path);
    setVisitNotes(existing.notes ?? '');
    setIsScheduled(Boolean(existing.is_scheduled));
    const next = emptyRows();
    for (const it of existing.items) {
      if (!isCategoryCode(it.category_code)) continue;
      const qty = Number(it.quantity ?? 1);
      const total = Number(it.total_price ?? 0);
      next[it.category_code].push({
        categoryCode: it.category_code,
        partName: it.part_name,
        quantity: qty,
        // Back-derive unit price so the form round-trips cleanly.
        unitPrice: qty > 0 ? Math.round((total / qty) * 100) / 100 : 0,
        totalPrice: total,
        notes: it.notes ?? '',
      });
    }
    setRows(next);
    seededFromExisting.current = true;
  }, [editing, existing]);

  const handlePickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const { blob, mime } = await compressImage(f);
      setReceipt({ blob, mime, previewUrl: URL.createObjectURL(blob) });
    } catch (err) {
      console.warn('[image] compress failed, using original', err);
      setReceipt({ blob: f, mime: f.type, previewUrl: URL.createObjectURL(f) });
    }
  };

  const allItems: DraftItem[] = (Object.keys(rows) as unknown as CategoryCode[])
    .flatMap((c) => rows[c])
    .filter((it) => it.partName.trim().length > 0);

  const subtotal = allItems.reduce((s, i) => s + Number(i.totalPrice || 0), 0);
  const totals = breakdown(subtotal);

  const save = async () => {
    if (!userId || !vehicle) return;
    if (!date) {
      setError('โปรดเลือกวันที่');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      // visitNotes is always defined (empty string means "no note" — the
      // repository normalises empty → null so the user can clear notes
      // when editing).
      if (editing && visitId) {
        await updateVisit(userId, visitId, {
          vehicleId: vehicle.id,
          serviceDate: toLocalIsoDate(date),
          mileage,
          serviceCenterId: centerId,
          items: allItems,
          notes: visitNotes,
          isScheduled,
          receiptBlob: receipt?.blob ?? null,
          receiptMime: receipt?.mime ?? null,
        });
      } else {
        await insertVisit(userId, {
          vehicleId: vehicle.id,
          serviceDate: toLocalIsoDate(date),
          mileage,
          serviceCenterId: centerId,
          items: allItems,
          notes: visitNotes,
          isScheduled,
          receiptBlob: receipt?.blob ?? null,
          receiptMime: receipt?.mime ?? null,
        });
      }
      navigate('/', { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!visitId) return;
    if (!window.confirm('ลบรายการนี้?')) return;
    setSaving(true);
    try {
      await deleteVisit(visitId);
      navigate('/', { replace: true });
    } finally {
      setSaving(false);
    }
  };

  if (!userId || !vehicle || (editing && !existing)) {
    return (
      <AppShell>
        <div className="flex h-40 items-center justify-center">
          <Spinner className="text-white" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mb-3 flex items-center justify-between">
        <Link to="/" className="text-xs font-medium text-white/90">
          ‹ กลับ
        </Link>
        <h1 className="text-base font-semibold text-white">
          {editing ? 'แก้ไขข้อมูล maintainance' : 'เพิ่มข้อมูล maintainance'}
        </h1>
        <label className="action-pill-ghost cursor-pointer">
          + เพิ่มรูปภาพ
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePickImage}
            className="hidden"
          />
        </label>
      </div>

      {receipt && (
        <div className="mb-3 flex items-center gap-3 rounded-card bg-card p-2">
          <img
            src={receipt.previewUrl}
            alt="ใบเสร็จ"
            className="h-16 w-16 rounded-tile object-cover"
          />
          <div className="flex-1 text-xs">
            <div className="font-semibold text-ink">แนบรูปใบเสร็จ</div>
            <div className="text-sub">
              {Math.round((receipt.blob.size / 1024) * 10) / 10} KB · {receipt.mime}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setReceipt(null)}
            className="rounded-tile bg-rose-500/90 px-2 py-1 text-xs font-semibold text-white"
          >
            ลบ
          </button>
        </div>
      )}
      {editing && !receipt && keepExistingReceiptPath && (
        <div className="mb-3 rounded-tile bg-white/10 px-3 py-2 text-[11px] text-white/90 backdrop-blur">
          มีรูปใบเสร็จเดิมอยู่แล้ว · เลือก "+ เพิ่มรูปภาพ" เพื่อแทนที่
        </div>
      )}

      <div className="space-y-3">
        <ThaiDatePicker value={date} onChange={setDate} label="วันที่รับบริการ" />

        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-1 block text-xs text-white/85">เลขไมล์</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={mileage}
              onChange={(e) => setMileage(Number(e.target.value) || 0)}
              className="w-full rounded-tile bg-white px-3 py-2.5 text-sm text-ink outline-none ring-1 ring-line focus:ring-2 focus:ring-brand"
            />
          </label>
          <div>
            <span className="mb-1 block text-xs text-white/85">ศูนย์บริการ</span>
            <ServiceCenterDropdown userId={userId} value={centerId} onChange={setCenterId} />
          </div>
        </div>

        {/* "เช็คระยะ" — scheduled maintenance check. Tile-styled label sits
            directly below the ศูนย์บริการ field per spec. */}
        <label className="flex items-center gap-3 rounded-card bg-card px-3 py-2.5">
          <input
            type="checkbox"
            checked={isScheduled}
            onChange={(e) => setIsScheduled(e.target.checked)}
            className="h-5 w-5 shrink-0 cursor-pointer accent-brand"
          />
          <span className="text-sm font-medium text-ink">เช็คระยะ</span>
          <span className="ml-auto text-[11px] text-sub">เช่น 10,000 / 20,000 km</span>
        </label>

        {CATEGORIES.map((c) => (
          <CategorySection
            key={c.code}
            userId={userId}
            categoryCode={c.code}
            items={rows[c.code]}
            onChange={(next) => setRows((s) => ({ ...s, [c.code]: next }))}
          />
        ))}

        {/* Visit-level note — shown above the sticky "รวมทั้งหมด" bar.
            Surfaces on dashboard recent list and history maintenance cards. */}
        <label className="block rounded-card bg-card p-3">
          <span className="mb-2 block text-sm font-semibold text-ink">หมายเหตุ</span>
          <textarea
            value={visitNotes}
            onChange={(e) => setVisitNotes(e.target.value)}
            rows={3}
            placeholder="เช่น เปลี่ยนเพราะมีเสียงดัง, ใช้รับประกัน, อื่นๆ..."
            className="w-full resize-none rounded-tile bg-brandSoft px-3 py-2 text-sm text-ink outline-none ring-1 ring-line focus:ring-2 focus:ring-brand"
          />
        </label>

        {error && (
          <div className="rounded-tile bg-rose-100 p-2 text-xs text-rose-900">{error}</div>
        )}

        {editing && (
          <button
            type="button"
            onClick={remove}
            disabled={saving}
            className="w-full rounded-tile bg-rose-500/90 px-4 py-2.5 text-sm font-semibold text-white active:scale-95 disabled:opacity-60"
          >
            ลบรายการนี้
          </button>
        )}

        <div className="sticky bottom-0 -mx-4 mt-4 border-t border-white/20 bg-brand/95 px-4 py-3 backdrop-blur">
          <div className="mb-3 space-y-1 text-sm text-white">
            <div className="flex items-center justify-between text-white/80">
              <span>รวม (ก่อน VAT)</span>
              <span>฿ {totals.subtotal.toLocaleString('th-TH')}</span>
            </div>
            <div className="flex items-center justify-between text-white/80">
              <span>ภาษีมูลค่าเพิ่ม 7%</span>
              <span>฿ {totals.vat.toLocaleString('th-TH')}</span>
            </div>
            <div className="flex items-center justify-between border-t border-white/20 pt-1.5">
              <span className="font-semibold">รวมทั้งหมด</span>
              <span className="text-lg font-bold">
                ฿ {totals.grandTotal.toLocaleString('th-TH')}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={save}
            disabled={saving || allItems.length === 0}
            className="flex w-full items-center justify-center rounded-card bg-white px-4 py-3 text-sm font-semibold text-brand active:scale-95 disabled:opacity-60"
          >
            {saving ? (
              <Spinner />
            ) : editing ? (
              `บันทึกการแก้ไข ${allItems.length} รายการ`
            ) : (
              `บันทึก ${allItems.length} รายการ`
            )}
          </button>
        </div>
      </div>
    </AppShell>
  );
}
