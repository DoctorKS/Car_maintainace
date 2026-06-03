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
 * Top-LEFT floating status chip — spinning gear when there's pending work
 * or the device is offline. Tap to force-flush.
 *
 * Hidden when fully synced, online, and no last error.
 */
export default function SyncBadge() {
  const { online, pending, lastError } = useOnlineStatus();

  if (online && pending === 0 && !lastError) return null;

  const busy = pending > 0;
  const offline = !online;
  const errored = !busy && Boolean(lastError);

  const label = offline
    ? `ออฟไลน์ · คิว ${pending}`
    : busy
      ? `กำลังซิงค์ ${pending}`
      : errored
        ? 'ซิงค์ผิดพลาด'
        : '';

  // Pill background + foreground.
  const tone = offline
    ? 'bg-amber-100 text-amber-900'
    : errored
      ? 'bg-rose-100 text-rose-900'
      : 'bg-white text-brand';

  return (
    <div
      className="fixed left-2 top-2 z-50"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <button
        type="button"
        onClick={() => scheduleFlush()}
        title={lastError ?? undefined}
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold shadow-soft ${tone}`}
      >
        <GearIcon
          className={`h-4 w-4 ${busy || offline ? 'gear-spin' : ''}`}
        />
        <span>{label}</span>
      </button>
    </div>
  );
}
