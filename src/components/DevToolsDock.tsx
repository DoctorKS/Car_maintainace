import { useState } from 'react';
import { forceResyncQueue } from '@/lib/sync/force-resync';
import { reloadAppVersion } from '@/lib/sync/reload';
import { summarizeDrift } from '@/lib/sync/drift';
import { dedupeAgainstServer } from '@/lib/sync/dedupe';
import { useDriftStatus } from '@/hooks/useDriftStatus';
import { useSession } from '@/lib/supabase/session';

/* ─── Icons (inline SVG, currentColor) ──────────────────────────────────── */

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
         strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M12 19V5" />
      <path d="m5 12 7-7 7 7" />
      <path d="M5 21h14" />
    </svg>
  );
}

function ReloadIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
         strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M21 12a9 9 0 1 1-3-6.7" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}

function StethoscopeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9}
         strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M4.5 3v6a4.5 4.5 0 0 0 9 0V3" />
      <path d="M4.5 3h2" />
      <path d="M13.5 3h-2" />
      <path d="M9 13.5v3a4.5 4.5 0 0 0 9 0v-1" />
      <circle cx="19" cy="12" r="2.2" />
    </svg>
  );
}

/* ─── Toast (one-line) ──────────────────────────────────────────────────── */

interface Toast {
  text: string;
  tone: 'ok' | 'warn';
}

/* ─── Dock ─────────────────────────────────────────────────────────────── */

/**
 * Bottom-LEFT floating dock with three controls, modelled on the
 * `bottom-bar` from /Shift_count/index.html:
 *
 *   ⬆ force-resync  — reset attempts + revive dead_letters, then flush
 *   ↻ reload         — pick up a new bundle without losing cache + queue
 *   🩺 drift check   — diff local vs Supabase, red dot when drift found,
 *                     auto-run every 5 min via useDriftStatus
 *
 * Stays mounted under <AuthGuard> only (we only render the dock once the
 * session is real — drift check needs a userId).
 */
export default function DevToolsDock() {
  const session = useSession();
  const userId = session?.user.id;
  const { result, refresh } = useDriftStatus(userId);
  const [toast, setToast] = useState<Toast | null>(null);
  const [busy, setBusy] = useState<'resync' | 'reload' | 'drift' | null>(null);

  // Don't show the dock until the user is signed in — keeps it off the
  // login page and prevents the drift check from hammering Supabase
  // without a JWT.
  if (!userId) return null;

  const showToast = (text: string, tone: 'ok' | 'warn' = 'ok') => {
    setToast({ text, tone });
    window.setTimeout(() => setToast(null), 4000);
  };

  const doResync = async () => {
    if (busy) return;
    setBusy('resync');
    try {
      // Phase 1 — clear "ghost" rows in Dexie that don't exist on Supabase.
      // Catches anything the new pull-guard prevents going forward.
      const sweep = await dedupeAgainstServer(userId);
      // Phase 2 — kick the queue.
      const r = await forceResyncQueue();
      const total = r.reset + r.revived;
      const sweepTotal = sweep.visitsRemoved + sweep.itemsRemoved;
      const parts: string[] = [];
      if (sweepTotal > 0) parts.push(`cleaned ${sweepTotal}`);
      if (total > 0) parts.push(`kicked ${total} (reset ${r.reset} · revived ${r.revived})`);
      showToast(
        parts.length === 0 ? '⬆ ไม่มีอะไรค้าง — queue ว่าง' : `⬆ ${parts.join(' · ')}`,
        'warn',
      );
      void refresh();
    } finally {
      setBusy(null);
    }
  };

  const doReload = async () => {
    if (busy) return;
    setBusy('reload');
    showToast('↻ กำลังโหลดเวอร์ชันใหม่...', 'warn');
    await reloadAppVersion();
  };

  const doDrift = async () => {
    if (busy) return;
    setBusy('drift');
    try {
      await refresh();
      const r = result; // pre-refresh — refresh updates state async
      const latest = r;
      if (latest) console.log('[drift]', latest);
      showToast(latest ? summarizeDrift(latest) : '🩺 กำลังตรวจสอบ...', latest?.drifted ? 'warn' : 'ok');
    } finally {
      setBusy(null);
    }
  };

  const hasDrift = result?.drifted ?? false;

  return (
    <>
      <div
        className="fixed left-3 z-40 flex flex-col items-start gap-2"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 14px)' }}
      >
        {/* ⬆ force-resync */}
        <button
          type="button"
          onClick={doResync}
          disabled={busy !== null}
          title="Force resync · ดัน queue ที่ค้างขึ้น Supabase ใหม่ + revive dead-letter"
          aria-label="Force resync queue"
          className="grid h-11 w-11 place-items-center rounded-full bg-white text-brand active:scale-95 disabled:opacity-50"
        >
          <UploadIcon className="h-5 w-5" />
        </button>

        {/* ↻ reload */}
        <button
          type="button"
          onClick={doReload}
          disabled={busy !== null}
          title="Reload — โหลดเวอร์ชันใหม่ของแอป (cache + queue ไม่หาย)"
          aria-label="Reload app version"
          className="grid h-11 w-11 place-items-center rounded-full bg-white text-brand active:scale-95 disabled:opacity-50"
        >
          <ReloadIcon className="h-5 w-5" />
        </button>

        {/* 🩺 drift check */}
        <button
          type="button"
          onClick={doDrift}
          disabled={busy !== null}
          title={
            result
              ? `Drift check — ${summarizeDrift(result)} (อัพเดต ${new Date(result.checkedAt).toLocaleTimeString('th-TH')})`
              : 'Drift check — เทียบ local กับ Supabase'
          }
          aria-label="Drift check"
          className="relative grid h-11 w-11 place-items-center rounded-full bg-white text-brand active:scale-95 disabled:opacity-50"
        >
          <StethoscopeIcon className="h-5 w-5" />
          {hasDrift && (
            <span
              className="absolute right-0 top-0 h-3 w-3 rounded-full border-2 border-white bg-rose-500"
              aria-label="drift detected"
            />
          )}
        </button>
      </div>

      {/* Toast — anchored next to the dock so it doesn't compete with cards */}
      {toast && (
        <div
          className="pointer-events-none fixed left-16 z-50 max-w-[68vw] rounded-tile px-3 py-2 text-xs font-medium shadow-card"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 18px)' }}
        >
          <div
            className={`pointer-events-auto rounded-tile px-3 py-2 ${
              toast.tone === 'warn' ? 'bg-amber-100 text-amber-900' : 'bg-white text-brand'
            }`}
          >
            {toast.text}
          </div>
        </div>
      )}
    </>
  );
}
