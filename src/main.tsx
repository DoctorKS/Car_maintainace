import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { router } from './router';
import { installFlushListeners, scheduleFlush } from './lib/sync/flush';
import { pullAll } from './lib/sync/pull';
import { probeSchema, resetSchemaProbe } from './lib/sync/schema-probe';
import { supabase } from './lib/supabase/client';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
  },
});

installFlushListeners();

// Initial pull + flush on app boot if already authenticated.
supabase.auth.getSession().then(({ data }) => {
  if (data.session) {
    probeSchema().catch(() => {});
    pullAll().catch((e) => console.error('[pull] initial failed', e));
    scheduleFlush();
  }
});

// Re-pull / re-flush on auth state changes (sign-in/sign-out).
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' && session) {
    // Sign-in may have switched accounts / projects — re-probe.
    resetSchemaProbe();
    probeSchema().catch(() => {});
    pullAll().catch((e) => console.error('[pull] after sign-in failed', e));
    scheduleFlush();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
