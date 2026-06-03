import type { ReactNode } from 'react';
import SyncBadge from './SyncBadge';

interface AppShellProps {
  children: ReactNode;
  /** When true, the inner column hugs the full width (default centred phone). */
  fullBleed?: boolean;
}

/**
 * Page wrapper — brand-blue background, safe-area aware, hosts the SyncBadge
 * (top-left).
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
      <SyncBadge />
      <div className={`mx-auto w-full ${fullBleed ? '' : 'max-w-md'} px-4 pt-3 pb-24`}>
        {children}
      </div>
    </div>
  );
}
