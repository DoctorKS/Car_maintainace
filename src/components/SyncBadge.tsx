import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { scheduleFlush } from '@/lib/sync/flush';

/** Gear SVG — `currentColor` strokes so it tints with text color. */
function GearIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.11-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.65 8.7a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1.03-1.56V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9a1.7 1.7 0 0 0 1.56 1.03H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1.03Z" />
    </svg>
  );
}

/**
 * Bottom-LEFT floating sync indicator — just a spinning gear in a white circle.
 * No text. Tap to force-flush. Hidden when fully synced + online + no error.
 *
 * Tones: brand (busy), amber (offline), rose (errored).
 */
export default function SyncBadge() {
  const { online, pending, lastError } = useOnlineStatus();

  if (online && pending === 0 && !lastError) return null;

  const busy = pending > 0;
  const offline = !online;
  const errored = !busy && Boolean(lastError);
  const spinning = busy || offline;

  const tone = offline
    ? 'bg-amber-100 text-amber-900'
    : errored
      ? 'bg-rose-100 text-rose-900'
      : 'bg-white text-brand';

  const label = offline
    ? `ออฟไลน์ — มีคิวค้าง ${pending} รายการ`
    : busy
      ? `กำลังซิงค์ ${pending} รายการ`
      : (lastError ?? 'ซิงค์ผิดพลาด');

  return (
    <button
      type="button"
      onClick={() => scheduleFlush()}
      title={label}
      aria-label={label}
      className={`fixed left-3 z-50 grid h-11 w-11 place-items-center rounded-full shadow-card ${tone}`}
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 14px)' }}
    >
      <GearIcon className={`h-5 w-5 ${spinning ? 'gear-spin' : ''}`} />
    </button>
  );
}
