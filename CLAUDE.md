# CLAUDE.md — guidance for Claude Code in this repo

> Project context for autonomous and assisted edits. Keep this short — link to
> [README.md](README.md) for full architecture, schema, and flow charts.

## What this repo is

A personal **mobile-first PWA** for tracking maintenance on **Mazda CX-5 2016
ทะเบียน ขข4699**, installable on iPhone. Thai + English UI, dates in
พุทธศักราช, Supabase backend (Auth + Postgres + Storage) with **RLS per user**,
**offline-first sync queue**, and a small 3D viewer of the car on the dashboard.

There is **no app server** — the client talks straight to Supabase over HTTPS
with the user's JWT. Deployed on Vercel via `vercel.json`.

## Tech stack at a glance

React 18 · Vite 5 · TypeScript 5 (strict) · Tailwind v3 · react-router v6 ·
Supabase JS v2 · TanStack Query v5 · Dexie v4 · Zustand v5 ·
@react-three/fiber v8 + three v0.169 · vite-plugin-pwa v0.20 · Vitest v2.

**Fonts:** self-hosted Inter Variable (Latin) + IBM Plex Sans Thai (Thai,
`unicode-range U+0E00-0E7F`).

**Theme:** brand blue `#1668CC` page + WHITE cards on top + ink/sub text.
Box-shadow tokens `shadow-card` / `shadow-soft` are currently set to `none`
(cards sit flat — the early "white glow halo" was visually wrong against the
blue background). `shadow-today` is preserved for the calendar's selected-day
highlight (intentional brand-blue glow). Card classes still carry the
utility names so re-enabling tokens later is one config edit.

## Architecture (5-second version)

```
UI ── useLiveQuery ──> Dexie ──> [_dirty flag]
UI ── mutations  ────> repository.ts ──┬──> Dexie write
                                       ├──> pending_mutations (Dexie)
                                       └──> scheduleFlush()

flush.ts: drains pending_mutations into Supabase upsert(onConflict=user_id+local_uuid)
          → backoff on transient errors, idempotent on replay.
pull.ts:  delta pull (updated_at >= lastSyncedAt) into Dexie on login / after flush.

RLS:      every row WHERE user_id = auth.uid().
Auth:     Supabase Email+password; JWT in localStorage via supabase-js.
```

Full diagrams + ER + sequence diagrams in [README.md §Architecture](README.md#architecture).

## Routes

| Path | Component | Purpose |
|---|---|---|
| `/login` | `LoginPage` | Email + password sign-in / sign-up |
| `/` | `DashboardPage` | Header → 3D viewer + mileage → 3-pill action row → recent 5 visits |
| `/add` | `AddMaintenancePage` | New visit form |
| `/edit/:visitId` | `AddMaintenancePage` (same component) | Edit-mode of the same form, pre-filled |
| `/history` | `HistoryCalendarPage` | Thai/BE calendar with red record dots |
| `/by-part` | `ByPartIndexPage` | 2×3 grid of category symbols (no text) |
| `/by-part/:code` | `ByPartPage` | Drill-in: parts list + per-part timeline |

The pencil button on every `MaintenanceCard` routes to `/edit/:id`. Edits
propagate across all surfaces (dashboard recent list, history calendar,
by-part timeline) automatically because every consumer reads from Dexie via
`useLiveQuery`.

## Key files

| Concern | Path |
|---|---|
| Repository façade (all UI mutations) | [`src/lib/sync/repository.ts`](src/lib/sync/repository.ts) — `insertVisit` / `updateVisit` / `deleteVisit` / `updateMileage` / `insertServiceCenter` / `insertCustomPart` |
| Dexie schema + `pending_mutations` + `pending_uploads` | [`src/lib/sync/db.ts`](src/lib/sync/db.ts) |
| Flush loop (online detection + backoff) | [`src/lib/sync/flush.ts`](src/lib/sync/flush.ts) |
| Delta pull | [`src/lib/sync/pull.ts`](src/lib/sync/pull.ts) |
| Supabase schema + RLS + new-user trigger | [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) |
| Item-level `notes` column | [`supabase/migrations/0002_item_notes.sql`](supabase/migrations/0002_item_notes.sql) **— must be run once on the project** |
| 6 categories + seed parts | [`src/lib/categories.ts`](src/lib/categories.ts) |
| Buddhist Era / Thai formatters (+ tests) | [`src/lib/thai-date/index.ts`](src/lib/thai-date/index.ts), [`index.test.ts`](src/lib/thai-date/index.test.ts) — 24 tests |
| 3D viewer (lazy-loaded) | [`src/three/CarViewer.tsx`](src/three/CarViewer.tsx), [`useCarModel.ts`](src/three/useCarModel.ts) |
| Calendar | [`src/components/CalendarGrid.tsx`](src/components/CalendarGrid.tsx) (handoff design) |
| Pages | [`src/pages/`](src/pages/) — `LoginPage`, `DashboardPage`, `AddMaintenancePage`, `HistoryCalendarPage`, `ByPartIndexPage`, `ByPartPage` |
| Category icons (PNG, user-supplied) | `public/icons/categories/cat-1.png` … `cat-6.png` (compressed copies of `/Button/*.png`, 10–56 KB each) |

## Conventions used in this repo

- **Path alias** `@/*` → `src/*`. Configured in [`tsconfig.json`](tsconfig.json) and [`vite.config.ts`](vite.config.ts).
- **Thai/English UI text** — Thai is primary; English in parentheses when the source pattern file uses both.
- **Dates** — every visible date goes through `formatThaiShort` / `formatThaiMedium` / `formatThaiLong`. Never render `Date.toLocaleDateString` directly.
- **Mutations always go through** [`repository.ts`](src/lib/sync/repository.ts). Never call `supabase.from(...).insert(...)` directly from a page.
- **Reads always go through Dexie** via `useLiveQuery` in hooks.
- **IDs are client-generated** (`uuid` package) so optimistic UI joins work.
- **Idempotency** — `maintenance_visits` and `maintenance_items` carry `local_uuid` with a unique constraint per user. Upserts use `onConflict: 'user_id,local_uuid'`.
- **`updateVisit` strategy** — delete all old items + insert fresh ones inside one Dexie transaction. The FIFO queue keeps server-side ordering as delete → insert → update.
- **Notes** — visit-level note lives on `maintenance_visits.notes`; per-item note lives on `maintenance_items.notes` (added by migration 0002). Empty / whitespace input is normalised to `null` so users can clear notes by erasing them.
- **3D viewer is `React.lazy`** — keep it that way; three.js + drei + FBXLoader is ~880 KB.
- **iOS safe-area** — `<AppShell>` already pads top/bottom with `env(safe-area-inset-*)`.

## Commands

```bash
npm run dev           # http://localhost:5173
npm test              # vitest run — 24 tests in thai-date
npm run typecheck     # tsc --noEmit
npm run build         # vite build + Workbox SW
npm run preview       # serve dist/ for local check
npm run lint          # eslint .
npm run format        # prettier --write src/**/*
```

## Adding a new mutation

1. Write a new `supabase/migrations/000X_<name>.sql` (don't edit older files).
2. Add the row type to [`src/types/db.ts`](src/types/db.ts).
3. Add a function to [`src/lib/sync/repository.ts`](src/lib/sync/repository.ts):
   - generate any IDs / `local_uuid` client-side,
   - inside a single Dexie transaction: `put` the row with `_dirty: 1` and
     `enqueue(entity, op, row)`,
   - call `scheduleFlush()` at the end.
4. Add a `useLiveQuery` hook in `src/hooks/` that returns the rows the UI needs.
5. Don't forget RLS on any new table — repeat the 4-policy pattern.
6. Run the new migration on the live Supabase project (SQL editor or `supabase db push`).

## Sync indicator

There is intentionally no on-screen sync badge anymore (the user removed
the gear). The flush mechanism still runs silently. To debug sync state:

- DevTools → Console: look for `[sync] flush error` / `[pull] ... failed`
  (now logged at `error` level for visibility).
- DevTools → Application → IndexedDB → `cx5-maint` → `pending_mutations`
  table. Non-empty means the queue hasn't drained.

If you need to surface state back to the user later, `useOnlineStatus` is
still exported from `src/hooks/useOnlineStatus.ts`.

## Known gotchas

- **`0002_item_notes.sql` must be applied to the live Supabase project**, or
  every item insert will fail with `column "notes" does not exist`. The
  `0001_init.sql` already includes `visits.notes`, so the visit-level note
  works without an extra migration.
- **FBX mesh names** — `useCarModel.ts` maps textures by mesh-name substring. If the FBX is replaced, run the inspection snippet in [`src/three/inspect-fbx.md`](src/three/inspect-fbx.md).
- **`navigator.onLine` lies** on iOS. The flush loop retries on `online`, `visibilitychange→visible`, and `focus`.
- **Tailwind v4 is not yet used.** Stay on v3.4.
- **No `gh` CLI on this machine.** Use raw `git push`.
- **iOS Safari + `autoFocus`** — async-mounted inputs (after `<select>` picker close) won't receive autoFocus. Use `useRef` + `useEffect(() => inputRef.focus(), [active])`. See `PartDropdown` / `ServiceCenterDropdown` for the pattern.
- **`/edit/:visitId` hydration refs** are reset on `visitId` change so navigating between consecutive edits re-seeds the form. Don't introduce other `useRef` "first-time" flags without doing the same.
- **CarViewer body paint is FBX-default**. We had an "all-black" pass and reverted; `useCarModel.ts` `body` slot is intentionally a no-op so the source material shows through.

## Don't do this

- ❌ Render Gregorian years anywhere user-visible. Always use `formatThai*` from `@/lib/thai-date`.
- ❌ Call `supabase.from(...).insert/update/delete` from a page — bypasses the offline queue.
- ❌ Add `service_role` keys to the client. The anon key + RLS is the design.
- ❌ Mutate `_dirty` flag from UI code; only `repository.ts` and `flush.ts` own that flag.
- ❌ Precache the FBX. It's loaded via Workbox runtime CacheFirst on first fetch.
- ❌ Use Chrome on iOS to install the PWA. It doesn't work — Safari only.
- ❌ Hardcode card shadows back in. The `shadow-card` / `shadow-soft` tokens are deliberately empty.
