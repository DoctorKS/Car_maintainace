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

  // Once the vehicle loads, default the mileage field to its current value.
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
          <Spinner />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mb-3 flex items-center justify-between">
        <Link to="/" className="text-xs text-white/70">
          ‹ กลับ
        </Link>
        <h1 className="text-base font-semibold">เพิ่มข้อมูล maintainance</h1>
        <label className="cursor-pointer rounded-full bg-primary-600 px-3 py-1.5 text-xs font-semibold shadow-sub active:scale-95">
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
        <div className="mb-3 flex items-center gap-3 rounded-card bg-primary-700 p-2 shadow-sub">
          <img
            src={receipt.previewUrl}
            alt="ใบเสร็จ"
            className="h-16 w-16 rounded-sub object-cover"
          />
          <div className="flex-1 text-xs">
            <div className="font-medium">แนบรูปใบเสร็จ</div>
            <div className="text-white/60">
              {Math.round((receipt.blob.size / 1024) * 10) / 10} KB · {receipt.mime}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setReceipt(null)}
            className="rounded-sub bg-red-500/80 px-2 py-1 text-xs"
          >
            ลบ
          </button>
        </div>
      )}

      <div className="space-y-3">
        <ThaiDatePicker value={date} onChange={setDate} label="วันที่รับบริการ" />

        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-1 block text-xs text-white/70">เลขไมล์</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={mileage}
              onChange={(e) => setMileage(Number(e.target.value) || 0)}
              className="w-full rounded-sub bg-primary-900 px-3 py-2.5 text-sm outline-none"
            />
          </label>
          <div>
            <span className="mb-1 block text-xs text-white/70">ศูนย์บริการ</span>
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

        {error && <div className="rounded-sub bg-red-500/20 p-2 text-xs text-red-100">{error}</div>}

        <div className="sticky bottom-0 -mx-4 mt-4 border-t border-white/10 bg-primary-900/95 px-4 py-3 backdrop-blur">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-white/70">รวมทั้งหมด</span>
            <span className="text-lg font-bold">฿ {totalAmount.toLocaleString('th-TH')}</span>
          </div>
          <button
            type="button"
            onClick={save}
            disabled={saving || allItems.length === 0}
            className="flex w-full items-center justify-center rounded-card bg-primary-600 px-4 py-3 text-sm font-semibold shadow-card active:scale-95 disabled:opacity-50"
          >
            {saving ? <Spinner /> : `บันทึก ${allItems.length} รายการ`}
          </button>
        </div>
      </div>
    </AppShell>
  );
}
