import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { router } from './router';
import './index.css';

/**
 * Server-direct architecture (Dexie removed in this pass).
 *
 * Every read goes through a React Query hook in `src/hooks/` that calls
 * Supabase REST directly. Every mutation in `src/lib/api.ts` calls Supabase
 * inline and invalidates the relevant query keys. There is no offline
 * mirror, no pending-mutation queue, no flush loop, no schema probe,
 * no DevToolsDock.
 *
 * Connectivity is required — if Supabase is unreachable, mutations throw
 * and the calling component shows the error. Reads return whatever React
 * Query last cached (default `staleTime: 10–30s` per hook).
 */

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
