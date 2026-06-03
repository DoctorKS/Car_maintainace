import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useDriftStatus, summarizeDrift } from '@/hooks/useDriftStatus';
import { useSession } from '@/lib/supabase/session';

/* ─── Icons (inline SVG, currentColor) ──────────────────────────────────── */

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M12 19V5" />
      <path d="m5 12 7-7 7 7" />
      <path d="M5 21h14" />
    </svg>
  );
}

function ReloadIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M21 12a9 9 0 1 1-3-6.7" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}

function StethoscopeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M4.5 3v6a4.5 4.5 0 0 0 9 0V3" />
      <path d="M4.5 3h2" />
      <path d="M13.5 3h-2" />
      <path d="M9 13.5v3a4.5 4.5 0 0 0 9 0v-1" />
      <circle cx="19" cy="12" r="2.2" />
    </svg>
  );
}

/* ─── Behaviour helpers (server-direct, no Dexie) ──────────────────────── */

/**
 * ⬆ Force-resync — there is no write queue in the server-direct
 * architecture, so "resync" means "drop every cached query and refetch
 * fresh from Supabase". This is the practical equivalent of clearing
 * any stale data without a full page reload.
 */
async function forceResync(
  queryClient: ReturnType<typeof useQueryClient>,
): Promise<{ touched: number }> {
  const before = queryClient.getQueryCache().getAll().length;
  await queryClient.invalidateQueries();
  return { touched: before };
}

/**
 * ↻ Reload the page picking up the latest deployed bundle, while keeping
 * the Workbox runtime caches (FBX, textures, fonts, Supabase REST) and
 * the React Query cache that lives in memory dies on reload — but the
 * service-worker caches don't, so we don't re-download the 6 MB FBX.
 */
async function reloadAppVersion(): Promise<void> {
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.update();
        if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    }
  } catch (e) {
    console.warn('[reload] service worker update failed; reloading anyway', e);
  }
  window.location.reload();
}

/* ─── Toast ────────────────────────────────────────────────────────────── */

interface Toast {
  text: string;
  tone: 'ok' | 'warn';
}

/* ─── Dock ─────────────────────────────────────────────────────────────── */

/**
 * Bottom-LEFT floating dock with three controls.
 *
 *   ⬆ force-resync  — invalidate every React Query and refetch fresh.
 *   ↻ reload        — pick up a new bundle without losing SW caches.
 *   🩺 drift check  — compare local cache count vs Supabase count for
 *                    maintenance_visits / maintenance_items. Red dot
 *                    when drifted, auto every 5 min via useDriftStatus.
 *
 * Self-guards on `useSession()`: it returns null until the session is
 * real, so the dock never shows on /login and the drift probe never
 * hammers Supabase without a JWT.
 */
export default function DevToolsDock() {
  const session = useSession();
  const userId = session?.user.id;
  const queryClient = useQueryClient();
  const { result, refresh } = useDriftStatus(userId);
  const [toast, setToast] = useState<Toast | null>(null);
  const [busy, setBusy] = useState<'resync' | 'reload' | 'drift' | null>(null);

  if (!userId) return null;

  const showToast = (text: string, tone: 'ok' | 'warn' = 'ok') => {
    setToast({ text, tone });
    window.setTimeout(() => setToast(null), 4000);
  };

  const doResync = async () => {
    if (busy) return;
    setBusy('resync');
    try {
      const r = await forceResync(queryClient);
      showToast(`⬆ refreshed ${r.touched} cached queries`, 'warn');
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
      if (result) console.log('[drift]', result);
      showToast(
        result ? summarizeDrift(result) : '🩺 กำลังตรวจสอบ...',
        result?.drifted ? 'warn' : 'ok',
      );
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
          title="Force resync · invalidate every cached query และดึงใหม่จาก Supabase"
          aria-label="Force resync queries"
          className="grid h-11 w-11 place-items-center rounded-full bg-white text-brand active:scale-95 disabled:opacity-50"
        >
          <UploadIcon className="h-5 w-5" />
        </button>

        {/* ↻ reload */}
        <button
          type="button"
          onClick={doReload}
          disabled={busy !== null}
          title="Reload — โหลดเวอร์ชันใหม่ของแอป (SW cache ไม่หาย)"
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
              ? `${summarizeDrift(result)} (อัพเดต ${new Date(result.checkedAt).toLocaleTimeString('th-TH')})`
              : 'Drift check — เทียบ React Query cache กับ Supabase'
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

      {/* Toast next to the dock */}
      {toast && (
        <div
          className="pointer-events-none fixed left-16 z-50 max-w-[68vw]"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 18px)' }}
        >
          <div
            className={`pointer-events-auto rounded-tile px-3 py-2 text-xs font-medium shadow-card ${
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
