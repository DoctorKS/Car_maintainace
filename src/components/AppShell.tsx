import type { ReactNode } from 'react';

interface AppShellProps {
  children: ReactNode;
  /** When true, the inner column hugs the full width (default centred phone). */
  fullBleed?: boolean;
}

/**
 * Page wrapper — brand-blue background, safe-area aware.
 *
 * The offline-sync gear (SyncBadge) was removed per user request. The
 * sync queue itself still runs silently via src/lib/sync/flush.ts.
 */
export default function AppShell({ children, fullBleed = false }: AppShellProps) {
  return (
    <div
      className="min-h-screen bg-brand text-white"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className={`mx-auto w-full ${fullBleed ? '' : 'max-w-md'} px-4 pt-3 pb-24`}>
        {children}
      </div>
    </div>
  );
}
