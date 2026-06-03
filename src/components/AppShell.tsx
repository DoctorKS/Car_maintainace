import type { ReactNode } from 'react';
import DevToolsDock from './DevToolsDock';

interface AppShellProps {
  children: ReactNode;
  /** When true, the inner column hugs the full width (default centred phone). */
  fullBleed?: boolean;
}

/**
 * Page wrapper — brand-blue background, safe-area aware.
 *
 * Hosts the DevToolsDock (⬆ resync · ↻ reload · 🩺 drift) at the
 * bottom-left. The dock self-guards on session: it returns null until
 * useSession() resolves to a real user, so it never shows on /login.
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
      <DevToolsDock />
    </div>
  );
}
