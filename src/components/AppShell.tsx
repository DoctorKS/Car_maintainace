import type { ReactNode } from 'react';
import OfflineBadge from './OfflineBadge';

interface AppShellProps {
  children: ReactNode;
}

/**
 * Page wrapper — full-height navy bg, safe-area aware, hosts the OfflineBadge
 * top-right.
 */
export default function AppShell({ children }: AppShellProps) {
  return (
    <div
      className="min-h-screen bg-primary-900 text-white font-sans antialiased"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <OfflineBadge />
      <div className="mx-auto w-full max-w-md px-4 pt-3 pb-24">{children}</div>
    </div>
  );
}
