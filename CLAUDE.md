# CLAUDE.md — guidance for Claude Code in this repo

> Project context for autonomous and assisted edits. Keep this short — link to
> [README.md](README.md) for full architecture, schema, and flow charts.

## What this repo is

A personal **mobile-first PWA** for tracking maintenance on **Mazda CX-5 2016
ทะเบียน ขข4699**, installable on iPhone. Thai + English UI, dates in
พุทธศักราช, Supabase backend (Auth + Postgres + Storage) with **RLS per user**,
**offline-first sync queue** that dead-letters after too many failures, and a
small 3D viewer of the car on the dashboard.

There is **no app server** — the client talks straight to Supabase over HTTPS
with the user's JWT. Deployed on Vercel via `vercel.json`.

## Tech stack at a glance

React 18 · Vite 5 · TypeScript 5 (strict) · Tailwind v3 · react-router v6 ·
Supabase JS v2 · TanStack Query v5 · Dexie v4 · Zustand v5 ·
@react-three/fiber v8 + three v0.169 · vite-plugin-pwa v0.20 · Vitest v2.

**Fonts:** self-hosted Inter Variable (Latin) + IBM Plex Sans Thai (Thai,
`unicode-range U+0E00-0E7F`).

**Theme:** brand blue `#1668CC` page + WHITE cards on top + ink/sub text.
`shadow-card` / `shadow-soft` Tailwind tokens are intentionally `'none'` —
the early "white glow halo" was visually wrong against the blue background.
`shadow-today` is preserved for the calendar's selected-day highlight.

## Architecture (5-second version)

```
UI ── useLiveQuery ──> Dexie ──> [_dirty flag]
UI ── mutations  ────> repository.ts ──┬──> Dexie write
                                       ├──> pending_mutations (Dexie)
                                       └──> scheduleFlush()

flush.ts: drains pending_mutations into Supabase upsert(onConflict=user_id+local_uuid)
          → backoff on transient errors, idempotent on replay.
          After MAX_ATTEMPTS (12 ≈ 5 min of capped backoff) → dead_letters.
schema-probe.ts: HEAD-checks optional columns (item-notes, visit-scheduled)
                 once after sign-in. flush.ts strips them when missing.
pull.ts:  delta pull (updated_at >= lastSyncedAt) into Dexie on login / after flush.
drift.ts: per-entity count(local) vs count(server) + queue health. Used by
          the 🩺 dock button and auto-polled every 5 min while signed in.

RLS:      every row WHERE user_id = auth.uid().
Auth:     Supabase Email+password; JWT in localStorage via supabase-js.
```

Full diagrams + ER + sequence diagrams in [README.md §Architecture](README.md#architecture).

## Routes

| Path | Component | Purpose |
|---|---|---|
| `/login` | `LoginPage` | Email + password sign-in / sign-up |
| `/` | `DashboardPage` | 3-pill action row → 3D viewer + mileage → recent 5 visits |
| `/add` | `AddMaintenancePage` | New visit form |
| `/edit/:visitId` | `AddMaintenancePage` (same component) | Edit-mode of the same form, pre-filled |
| `/history` | `HistoryCalendarPage` | Thai/BE calendar w/ red record dots + bottom monthly summary |
| `/by-part` | `ByPartIndexPage` | 2×3 grid of category symbols (transparent, no text) |
| `/by-part/:code` | `ByPartPage` | Drill-in: parts list + per-part timeline |

The pencil button on every `MaintenanceCard` routes to `/edit/:id`. Edits
propagate across all surfaces (dashboard recent list, history calendar,
by-part timeline) via `useLiveQuery`.

## Key files

| Concern | Path |
|---|---|
| Repository façade (all UI mutations) | [`src/lib/sync/repository.ts`](src/lib/sync/repository.ts) — `insertVisit` / `updateVisit` / `deleteVisit` / `updateMileage` / `insertServiceCenter` / `insertCustomPart` |
| Dexie schema (v2 with `dead_letters`) | [`src/lib/sync/db.ts`](src/lib/sync/db.ts) |
| Flush loop + dead-letter at `MAX_ATTEMPTS=12` | [`src/lib/sync/flush.ts`](src/lib/sync/flush.ts) |
| Delta pull | [`src/lib/sync/pull.ts`](src/lib/sync/pull.ts) |
| Schema probe (optional column detection) | [`src/lib/sync/schema-probe.ts`](src/lib/sync/schema-probe.ts) |
| Force-resync (queue kick + dead-letter revive) | [`src/lib/sync/force-resync.ts`](src/lib/sync/force-resync.ts) |
| Reload app + skip-waiting SW | [`src/lib/sync/reload.ts`](src/lib/sync/reload.ts) |
| Drift check (local vs Supabase counts) | [`src/lib/sync/drift.ts`](src/lib/sync/drift.ts) |
| VAT 7% helper (display-only) | [`src/lib/vat.ts`](src/lib/vat.ts) — `vatOf`, `withVat`, `breakdown` |
| 6 categories + seed parts | [`src/lib/categories.ts`](src/lib/categories.ts) |
| Buddhist Era / Thai formatters (+ tests) | [`src/lib/thai-date/index.ts`](src/lib/thai-date/index.ts), [`index.test.ts`](src/lib/thai-date/index.test.ts) — 24 tests |
| 3D viewer (lazy-loaded) | [`src/three/CarViewer.tsx`](src/three/CarViewer.tsx), [`useCarModel.ts`](src/three/useCarModel.ts) |
| Calendar | [`src/components/CalendarGrid.tsx`](src/components/CalendarGrid.tsx) |
| DevTools dock (bottom-left, ⬆↻🩺) | [`src/components/DevToolsDock.tsx`](src/components/DevToolsDock.tsx) + [`src/hooks/useDriftStatus.ts`](src/hooks/useDriftStatus.ts) |
| Supabase schema + RLS + new-user trigger | [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) |
| Item-level `notes` column | [`supabase/migrations/0002_item_notes.sql`](supabase/migrations/0002_item_notes.sql) **— must be run on the project** |
| Visit-level `is_scheduled` column | [`supabase/migrations/0003_visit_scheduled.sql`](supabase/migrations/0003_visit_scheduled.sql) **— must be run on the project** |
| Category 6 = "เครื่องยนต์", code 7 = "อื่นๆ" | [`supabase/migrations/0004_add_engine_category.sql`](supabase/migrations/0004_add_engine_category.sql) **— must be run BEFORE the new client lands**, otherwise existing "อื่นๆ" rows (server code=6) start displaying as Engine on devices that already ran Dexie v3 |
| Pages | [`src/pages/`](src/pages/) — `LoginPage`, `DashboardPage`, `AddMaintenancePage`, `HistoryCalendarPage`, `ByPartIndexPage`, `ByPartPage` |
| Category icons (PNG) | `public/icons/categories/cat-1.png` … `cat-6.png` (compressed from `/Button/*.png`, 10–56 KB each) |

## Conventions used in this repo

- **Path alias** `@/*` → `src/*`.
- **Thai/English UI text** — Thai is primary; English in parentheses when the source pattern file uses both.
- **Dates** — every visible date goes through `formatThaiShort` / `formatThaiMedium` / `formatThaiLong`. Never render `Date.toLocaleDateString` directly.
- **Mutations always go through** [`repository.ts`](src/lib/sync/repository.ts). Never call `supabase.from(...).insert(...)` directly from a page.
- **Reads always go through Dexie** via `useLiveQuery` in hooks.
- **IDs are client-generated** (`uuid` package) so optimistic UI joins work.
- **Idempotency** — `maintenance_visits` and `maintenance_items` carry `local_uuid` with a unique constraint per user. Upserts use `onConflict: 'user_id,local_uuid'`.
- **`updateVisit` strategy** — delete all old items + insert fresh ones inside one Dexie transaction. The FIFO queue keeps server-side ordering as delete → insert → update.
- **Optional columns** (`maintenance_items.notes` from 0002, `maintenance_visits.is_scheduled` from 0003) are stripped from upserts when the value is null/empty OR the schema probe says missing. Adding more optional columns: extend `schema-probe.ts` + the strip rules in `flush.ts.applyMutation`.
- **VAT 7%** is a **display-time transform only**. DB still stores `total_price` as the pre-VAT row total. Every "ยอดรวม" rendered on screen pipes through `breakdown(subtotal)` from `src/lib/vat.ts` so subtotal / VAT / grand-total stay consistent.
- **3D viewer is `React.lazy`** — keep it that way; three.js + drei + FBXLoader is ~880 KB.
- **iOS safe-area** — `<AppShell>` pads top/bottom with `env(safe-area-inset-*)`.
- **DevToolsDock** is the **only on-screen sync surface**. There is no banner / gear. Self-guards on `useSession()` so it never shows on `/login`.

## DevToolsDock (bottom-left, ⬆ ↻ 🩺)

Three controls, mounted by `AppShell`. Mirror of the pattern in `/Shift_count/index.html`'s `bottom-bar`:

| Button | Function | What it actually does |
|---|---|---|
| ⬆ | `forceResyncQueue()` | Reset `attempts` + `last_error` on every pending mutation, revive every row in `dead_letters` back into `pending_mutations`, schedule a flush. |
| ↻ | `reloadAppVersion()` | `swReg.update()` → `postMessage('SKIP_WAITING')` if a worker is `waiting` → `location.reload()`. IndexedDB + Workbox caches survive. |
| 🩺 | `runDriftCheck(userId)` | Count local vs server (HEAD requests) per user-scoped table + queue health. Auto every 5 min via `useDriftStatus`. Red dot when `drifted === true`. |

A one-line toast appears next to the dock for 4 s after each action.

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
5. RLS on any new table — repeat the 4-policy pattern from `0001_init.sql`.
6. If the migration adds an **optional** column (existing rows nullable / default), wire it through [`schema-probe.ts`](src/lib/sync/schema-probe.ts) + the strip rules in [`flush.ts`](src/lib/sync/flush.ts) `applyMutation` so the client self-heals when the migration hasn't been applied.
7. Run the new migration on the live Supabase project (SQL editor or `supabase db push`).

## Known gotchas

- **Migrations `0002`, `0003`, `0004` must be applied to the live Supabase project.** Without 0002 / 0003 the optional `notes` / `is_scheduled` fields are silently dropped on the server (the schema probe handles the strip). Without 0004 the new client will write `category_code = 6` meaning "เครื่องยนต์" into a DB where the constraint still says 1..6 with `6 = อื่นๆ` — server rejects the insert if any existing rows haven't been renumbered (or worse, succeeds and stores semantically-wrong data). **0004 must run before the client bundle that contains the engine category goes live.** Dexie v3 upgrade hook handles the renumber on each device the first time the new code boots.
- **FBX mesh names** — `useCarModel.ts` maps textures by mesh-name substring. If the FBX is replaced, run the inspection snippet in [`src/three/inspect-fbx.md`](src/three/inspect-fbx.md).
- **`navigator.onLine` lies** on iOS. The flush loop retries on `online`, `visibilitychange→visible`, and `focus`.
- **Tailwind v4 is not yet used.** Stay on v3.4.
- **No `gh` CLI on this machine.** Use raw `git push`.
- **iOS Safari + `autoFocus`** — async-mounted inputs (after `<select>` picker close) won't receive autoFocus. Use `useRef` + `useEffect(() => inputRef.focus(), [active])`. See `PartDropdown` / `ServiceCenterDropdown` for the pattern.
- **`/edit/:visitId` hydration refs** are reset on `visitId` change so navigating between consecutive edits re-seeds the form. Don't introduce other `useRef` "first-time" flags without doing the same.
- **CarViewer body paint is FBX-default**. We had an "all-black" pass and reverted; `useCarModel.ts` `body` slot is intentionally a no-op so the source material shows through.
- **Dexie schema v2** added the `dead_letters` table. Don't downgrade the version block — Dexie's migration is forward-only.
- **Dead-letter mutations don't auto-retry.** They only re-enter the queue via `forceResyncQueue()` (⬆ button). Make sure that's known when triaging "ข้อมูลไม่ขึ้น" reports.
- **Drift check makes 5 HEAD requests on every poll** (one per user-scoped table). Don't shorten the 5-min interval without adjusting the per-tab budget.

## Don't do this

- ❌ Render Gregorian years anywhere user-visible. Always use `formatThai*` from `@/lib/thai-date`.
- ❌ Call `supabase.from(...).insert/update/delete` from a page — bypasses the offline queue.
- ❌ Add `service_role` keys to the client. The anon key + RLS is the design.
- ❌ Mutate `_dirty` flag from UI code; only `repository.ts` and `flush.ts` own that flag.
- ❌ Precache the FBX. It's loaded via Workbox runtime CacheFirst on first fetch.
- ❌ Use Chrome on iOS to install the PWA. It doesn't work — Safari only.
- ❌ Hardcode card shadows back in. The `shadow-card` / `shadow-soft` tokens are deliberately empty.
- ❌ Multiply by `1.07` ad-hoc in components. Pipe through `breakdown()` from `src/lib/vat.ts` so the VAT rate has exactly one source of truth.
- ❌ Skip a column from the schema probe when you add it as optional — that's how dead-letter loops creep in.
- ❌ Render a second drift indicator (banner, toast, dot in the title) — the 🩺 dock button is the single surface.
