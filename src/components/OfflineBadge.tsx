import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { scheduleFlush } from '@/lib/sync/flush';

export default function OfflineBadge() {
  const { online, pending, lastError } = useOnlineStatus();

  if (online && pending === 0 && !lastError) return null;

  const label = !online
    ? `ออฟไลน์ · คิว ${pending}`
    : pending > 0
      ? `กำลังซิงค์ ${pending}`
      : lastError
        ? 'ซิงค์ผิดพลาด'
        : '';

  return (
    <div
      className="fixed top-2 right-2 z-50"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <button
        type="button"
        onClick={() => scheduleFlush()}
        className={`rounded-full px-3 py-1 text-xs font-medium shadow-sub
          ${!online ? 'bg-amber-500 text-black' : pending > 0 ? 'bg-primary-600 text-white' : 'bg-red-500 text-white'}`}
        title={lastError ?? undefined}
      >
        {label}
      </button>
    </div>
  );
}
