import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import ThaiDatePicker from '@/components/ThaiDatePicker';
import ServiceCenterDropdown from '@/components/ServiceCenterDropdown';
import CategorySection from '@/components/CategorySection';
import Spinner from '@/components/Spinner';
import { CATEGORIES, type CategoryCode } from '@/lib/categories';
import { useSession } from '@/lib/supabase/session';
import { useVehicle } from '@/hooks/useVehicle';
import { compressImage } from '@/lib/image';
import { insertVisit } from '@/lib/sync/repository';
import { toLocalIsoDate } from '@/lib/thai-date';
import type { DraftItem } from '@/types/domain';

const blankRows: Record<CategoryCode, DraftItem[]> = {
  1: [],
  2: [],
  3: [],
  4: [],
  5: [],
  6: [],
};

export default function AddMaintenancePage() {
  const session = useSession();
  const userId = session?.user.id;
  const vehicle = useVehicle(userId);
  const navigate = useNavigate();

  const [date, setDate] = useState<Date | null>(new Date());
  const [mileage, setMileage] = useState<number>(vehicle?.mileage ?? 0);
  const [centerId, setCenterId] = useState<string | null>(null);
  const [rows, setRows] = useState<Record<CategoryCode, DraftItem[]>>(() => blankRows);
  const [receipt, setReceipt] = useState<{ blob: Blob; mime: string; previewUrl: string } | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (vehicle && mileage === 0) {
    setMileage(vehicle.mileage);
  }

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

  const totalAmount = allItems.reduce((s, i) => s + Number(i.totalPrice || 0), 0);

  const save = async () => {
    if (!userId || !vehicle) return;
    if (!date) {
      setError('โปรดเลือกวันที่');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await insertVisit(userId, {
        vehicleId: vehicle.id,
        serviceDate: toLocalIsoDate(date),
        mileage,
        serviceCenterId: centerId,
        items: allItems,
        receiptBlob: receipt?.blob ?? null,
        receiptMime: receipt?.mime ?? null,
      });
      navigate('/', { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (!userId || !vehicle) {
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
        <h1 className="text-base font-semibold text-white">เพิ่มข้อมูล maintainance</h1>
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
        <div className="mb-3 flex items-center gap-3 rounded-card bg-card p-2 shadow-soft">
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

        {/* 6 categories */}
        {CATEGORIES.map((c) => (
          <CategorySection
            key={c.code}
            userId={userId}
            categoryCode={c.code}
            items={rows[c.code]}
            onChange={(next) => setRows((s) => ({ ...s, [c.code]: next }))}
          />
        ))}

        {error && (
          <div className="rounded-tile bg-rose-100 p-2 text-xs text-rose-900">{error}</div>
        )}

        <div className="sticky bottom-0 -mx-4 mt-4 border-t border-white/20 bg-brand/90 px-4 py-3 backdrop-blur">
          <div className="mb-2 flex items-center justify-between text-sm text-white">
            <span className="text-white/85">รวมทั้งหมด</span>
            <span className="text-lg font-bold">฿ {totalAmount.toLocaleString('th-TH')}</span>
          </div>
          <button
            type="button"
            onClick={save}
            disabled={saving || allItems.length === 0}
            className="flex w-full items-center justify-center rounded-card bg-white px-4 py-3 text-sm font-semibold text-brand shadow-card active:scale-95 disabled:opacity-60"
          >
            {saving ? <Spinner /> : `บันทึก ${allItems.length} รายการ`}
          </button>
        </div>
      </div>
    </AppShell>
  );
}
