# CLAUDE.md — guidance for Claude Code in this repo

> Project context for autonomous and assisted edits. Keep this short — link to
> [README.md](README.md) for full architecture, schema, and flow charts.

## What this repo is

A personal **mobile-first PWA** for tracking maintenance on **Mazda CX-5 2016
ทะเบียน ขข4699**, installable on iPhone. Thai + English UI, dates in
พุทธศักราช, Supabase backend (Auth + Postgres + Storage) with **RLS per user**,
and a small 3D viewer of the car on the dashboard.

There is **no app server** — the client talks straight to Supabase over HTTPS
with the user's JWT. Deployed on Vercel via `vercel.json`.

## Architectural posture: server-direct, no local mirror

The previous Dexie + pending-mutations + flush-loop + delta-pull stack was
**removed in commit [`df2703b`](https://github.com/DoctorKS/Car_maintainace/commit/df2703b)** (see [`BUGS.md` entry "dexie-sync-removed-radical-fix"](BUGS.md))
after repeated duplicate / resurrection bugs that the maintenance burden of
two-source-of-truth synchronisation couldn't justify on a single-user app.

Today:

- **Reads** go through React Query hooks in `src/hooks/` that call
  `supabase.from(...).select()` directly.
- **Mutations** in `src/lib/api.ts` call Supabase inline and the calling
  component then `invalidateQueries(['<key>'])` to refresh the UI.
- **Connectivity is required.** If Supabase is unreachable a mutation throws
  and the calling form shows the error. There is no offline write queue.

## Tech stack at a glance

React 18 · Vite 5 · TypeScript 5 (strict) · Tailwind v3 · react-router v6 ·
Supabase JS v2 · TanStack Query v5 · Zustand v5 ·
@react-three/fiber v8 + three v0.169 · vite-plugin-pwa v0.20 · Vitest v2.

**Removed since the last write of this file:** Dexie, dexie-react-hooks, all
of `src/lib/sync/*`, `DevToolsDock`, `useDriftStatus`, `useOnlineStatus`.

**Fonts:** self-hosted Inter Variable (Latin) + IBM Plex Sans Thai (Thai,
`unicode-range U+0E00-0E7F`).

**Theme:** brand blue `#1668CC` page + WHITE cards on top + ink/sub text.
`shadow-card` / `shadow-soft` Tailwind tokens are intentionally `'none'`.

## Architecture (5-second version)

```
UI ──── useQuery hooks ──── supabase.from(...).select() ──── Postgres + RLS
UI ──── api.* mutations ──── supabase.from(...).insert/update/delete ──── Postgres + RLS
UI ──── queryClient.invalidateQueries([...])  ──── triggers refetch

RLS:  every row WHERE user_id = auth.uid().
Auth: Supabase Email+password; JWT in localStorage via supabase-js.
```

That's the entire data path. Compare against the old diagram in git
history before `df2703b` to see what was removed.

## Routes

| Path | Component | Purpose |
|---|---|---|
| `/login` | `LoginPage` | Email + password sign-in / sign-up |
| `/` | `DashboardPage` | 3-pill action row → 3D viewer + mileage → recent 5 visits |
| `/add` | `AddMaintenancePage` | New visit form |
| `/edit/:visitId` | `AddMaintenancePage` (same component) | Edit-mode of the same form, pre-filled |
| `/history` | `HistoryCalendarPage` | Thai/BE calendar w/ red record dots + monthly summary |
| `/by-part` | `ByPartIndexPage` | 2×3 grid of category symbols (transparent, no text) |
| `/by-part/:code` | `ByPartPage` | Drill-in: parts list + per-part timeline |

## Key files

| Concern | Path |
|---|---|
| Direct-Supabase mutations | [`src/lib/api.ts`](src/lib/api.ts) — `insertVisit` / `updateVisit` / `deleteVisit` / `updateMileage` / `insertServiceCenter` / `insertCustomPart` |
| Visit reads (page / range / date-set / count / single) | [`src/hooks/useMaintenanceVisits.ts`](src/hooks/useMaintenanceVisits.ts) |
| Vehicle / centers / custom parts / by-part / receipt URL | [`src/hooks/`](src/hooks/) |
| Supabase client + session hook | [`src/lib/supabase/`](src/lib/supabase/) |
| VAT 7% helper (display-only) | [`src/lib/vat.ts`](src/lib/vat.ts) — `vatOf`, `withVat`, `breakdown` |
| 6 categories + seed parts | [`src/lib/categories.ts`](src/lib/categories.ts) |
| Buddhist Era / Thai formatters (+ tests) | [`src/lib/thai-date/index.ts`](src/lib/thai-date/index.ts), [`index.test.ts`](src/lib/thai-date/index.test.ts) — 24 tests |
| 3D viewer (lazy-loaded) | [`src/three/CarViewer.tsx`](src/three/CarViewer.tsx), [`useCarModel.ts`](src/three/useCarModel.ts) |
| Calendar | [`src/components/CalendarGrid.tsx`](src/components/CalendarGrid.tsx) |
| Supabase schema | [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) + 0002 (item notes) + 0003 (is_scheduled) + 0004 (engine category) |

## Conventions

- **Path alias** `@/*` → `src/*`.
- **Dates** — every visible date goes through `formatThaiShort` / `formatThaiMedium` / `formatThaiLong`. Never render `Date.toLocaleDateString` directly.
- **Mutations go through** [`src/lib/api.ts`](src/lib/api.ts). The page calling it `invalidateQueries(['visits', userId])` (or the relevant key) immediately after.
- **Reads go through React Query hooks** in `src/hooks/`. Never call `supabase.from(...)` directly in a component.
- **IDs are client-generated** (`uuid`) so the inserted row has a known id before the server round-trip — lets the `/edit/:id` navigation work without re-fetching.
- **Optimistic UI is opt-in.** Default is "save → invalidate → wait for refetch → render fresh data". For surfaces that need instant feedback (e.g. mileage edit), wrap the mutation in `useMutation` with `onMutate` rolling back on error. None of the current callers do this yet — they all rely on the post-save invalidate.
- **VAT 7%** is a **display-time transform**. DB stores `total_price` pre-VAT. Pipe through `breakdown(subtotal)` from `src/lib/vat.ts` so the three numbers stay consistent.
- **3D viewer is `React.lazy`** — keep it that way.

## Commands

```bash
npm run dev           # http://localhost:5173
npm test              # vitest run — 24 tests in thai-date
npm run typecheck     # tsc --noEmit
npm run build         # vite build + Workbox SW
npm run preview       # serve dist/ for local check
```

## Adding a new mutation

1. Write a new `supabase/migrations/000X_<name>.sql` (don't edit older files).
2. Add the row type to [`src/types/db.ts`](src/types/db.ts).
3. Add a function to [`src/lib/api.ts`](src/lib/api.ts) — `async function`, calls Supabase, throws on error.
4. Add a `useQuery` hook in `src/hooks/` for any read the UI needs.
5. After calling the new mutation in a component, invalidate the relevant query keys: `await queryClient.invalidateQueries({ queryKey: [...] })`.
6. RLS on any new table — repeat the 4-policy pattern from `0001_init.sql`.
7. Run the new migration on the live Supabase project (SQL editor or `supabase db push`).

## Known gotchas

- **All migrations must be applied to the live Supabase project** in order. Without 0002 the per-item `notes` insert fails with PGRST 42703; without 0003 the `is_scheduled` insert fails; without 0004 inserts with `category_code = 6` (Engine) hit the old `1..6` constraint where 6 means "อื่นๆ".
- **No offline support.** If a user is on the subway the form throws on save. We could re-add `useMutation` with retry, but explicit error is the current contract.
- **FBX mesh names** — `useCarModel.ts` maps textures by mesh-name substring. If the FBX is replaced, run the inspection snippet in [`src/three/inspect-fbx.md`](src/three/inspect-fbx.md).
- **iOS Safari + `autoFocus`** — async-mounted inputs (after `<select>` picker close) won't receive autoFocus. Use `useRef` + `useEffect(() => inputRef.focus(), [active])`. See `PartDropdown` / `ServiceCenterDropdown` for the pattern.
- **`/edit/:visitId` hydration refs** are reset on `visitId` change so navigating between consecutive edits re-seeds the form. Don't introduce other `useRef` "first-time" flags without doing the same.
- **CarViewer body paint is FBX-default**. `useCarModel.ts` `body` slot is intentionally a no-op so the source material shows through.
- **Tailwind v4 is not yet used.** Stay on v3.4.
- **No `gh` CLI on this machine.** Use raw `git push`.

## Don't do this

- ❌ Reintroduce a local mirror (Dexie / IndexedDB / localStorage cache). The previous one cost more than it bought; see [BUGS.md "dexie-sync-removed-radical-fix"](BUGS.md).
- ❌ Render Gregorian years anywhere user-visible. Always use `formatThai*` from `@/lib/thai-date`.
- ❌ Call `supabase.from(...).insert/update/delete` from a page. Go through `src/lib/api.ts`.
- ❌ Forget the `invalidateQueries` after a mutation — the UI won't refresh.
- ❌ Add `service_role` keys to the client. The anon key + RLS is the design.
- ❌ Hardcode card shadows back in. The `shadow-card` / `shadow-soft` tokens are deliberately empty.
- ❌ Multiply by `1.07` ad-hoc. Pipe through `breakdown()` from `src/lib/vat.ts`.
- ❌ Use Chrome on iOS to install the PWA. Safari only.
