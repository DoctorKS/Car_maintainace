# CLAUDE.md — guidance for Claude Code in this repo

> Project context for autonomous and assisted edits. Keep this short — link to
> [README.md](README.md) for full architecture, schema, and flow charts.

## What this repo is

A personal **mobile-first PWA** for tracking maintenance on **Mazda CX-5 2016
ทะเบียน ขข4699**, installable on iPhone. Thai + English UI, dates in
พุทธศักราช, Supabase backend (Auth + Postgres + Storage) with **RLS per user**,
**offline-first sync queue**, and a small 3D viewer of the car on the dashboard.

There is **no app server** — the client talks straight to Supabase over HTTPS
with the user's JWT.

## Tech stack at a glance

React 18 · Vite 5 · TypeScript 5 (strict) · Tailwind v3 · react-router v6 ·
Supabase JS v2 · TanStack Query v5 · Dexie v4 · Zustand v5 ·
@react-three/fiber v8 + three v0.169 · vite-plugin-pwa v0.20 · Vitest v2.

**Fonts:** self-hosted Inter Variable (Latin) + IBM Plex Sans Thai (Thai,
`unicode-range U+0E00-0E7F`). Free stand-in for Universal Sans.

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

## Key files

| Concern | Path |
|---|---|
| Repository façade (all UI mutations) | [`src/lib/sync/repository.ts`](src/lib/sync/repository.ts) |
| Dexie schema + `pending_mutations` + `pending_uploads` | [`src/lib/sync/db.ts`](src/lib/sync/db.ts) |
| Flush loop (online detection + backoff) | [`src/lib/sync/flush.ts`](src/lib/sync/flush.ts) |
| Delta pull | [`src/lib/sync/pull.ts`](src/lib/sync/pull.ts) |
| Supabase schema + RLS + new-user trigger | [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) |
| 6 categories + seed parts | [`src/lib/categories.ts`](src/lib/categories.ts) |
| Buddhist Era / Thai formatters (+ tests) | [`src/lib/thai-date/index.ts`](src/lib/thai-date/index.ts), [`index.test.ts`](src/lib/thai-date/index.test.ts) |
| 3D viewer (lazy-loaded) | [`src/three/CarViewer.tsx`](src/three/CarViewer.tsx), [`useCarModel.ts`](src/three/useCarModel.ts) |
| Routes | [`src/router.tsx`](src/router.tsx) |
| Pages | [`src/pages/`](src/pages/) — `LoginPage`, `DashboardPage`, `AddMaintenancePage`, `HistoryCalendarPage`, `ByPartPage` |

## Conventions used in this repo

- **Path alias** `@/*` → `src/*`. Configured in
  [`tsconfig.json`](tsconfig.json) and [`vite.config.ts`](vite.config.ts).
- **Thai/English UI text** — Thai is primary; English in parentheses when the
  source pattern file uses both.
- **Dates** — every visible date goes through `formatThaiShort` /
  `formatThaiMedium` / `formatThaiLong`. Never render `Date.toLocaleDateString`
  directly (it'd leak Gregorian years).
- **Mutations always go through** [`repository.ts`](src/lib/sync/repository.ts).
  Never call `supabase.from(...).insert(...)` directly from a page — it bypasses
  the offline queue.
- **Reads always go through Dexie** via `useLiveQuery` in hooks. React Query is
  here for future server-only data (signed URLs, etc.), not for the user's own
  rows.
- **IDs are client-generated** (`uuid` package) so optimistic UI joins work
  before the server has acknowledged the row.
- **Idempotency** — `maintenance_visits` and `maintenance_items` carry
  `local_uuid` with a unique constraint per user. Upserts use
  `onConflict: 'user_id,local_uuid'`.
- **3D viewer is `React.lazy`** — keep it that way; three.js + drei + FBXLoader
  is ~880 KB.
- **iOS safe-area** — `<AppShell>` already pads top/bottom with
  `env(safe-area-inset-*)`. New full-screen views should wrap in `<AppShell>`.

## Commands

```bash
npm run dev           # http://localhost:5173
npm test              # vitest run
npm run typecheck     # tsc --noEmit
npm run build         # vite build + Workbox SW
npm run preview       # serve dist/ for local check
npm run lint          # eslint .
npm run format        # prettier --write src/**/*
```

## Adding a new mutation

1. Define the SQL change in a new
   `supabase/migrations/000X_<name>.sql` (don't edit `0001_init.sql`).
2. Add the row type to [`src/types/db.ts`](src/types/db.ts).
3. Add a function to [`src/lib/sync/repository.ts`](src/lib/sync/repository.ts):
   - generate any IDs / `local_uuid` client-side,
   - inside a single Dexie transaction: `put` the row with `_dirty: 1` and
     `enqueue(entity, op, row)`,
   - call `scheduleFlush()` at the end.
4. Add a `useLiveQuery` hook in `src/hooks/` that returns the rows the UI needs.
5. Don't forget RLS on any new table — repeat the 4-policy pattern.

## Known gotchas

- **FBX mesh names** — `useCarModel.ts` maps textures by mesh-name substring
  (`/tire|wheel/`, `/light|lamp/`, etc.). If the FBX is replaced, run the
  inspection snippet in [`src/three/inspect-fbx.md`](src/three/inspect-fbx.md)
  to update the rules.
- **Storage uploads can't be upserted by `local_uuid`** — they go via a
  separate `pending_uploads` table and patch the visit's `receipt_image_path`
  after a successful upload.
- **`navigator.onLine` lies** sometimes (especially on iOS). The flush loop
  treats the absence of network as transient and retries on `online`,
  `visibilitychange→visible`, and `focus`.
- **Tailwind v4 is not yet used.** Stay on v3.4 — `tailwind.config.ts` (TS)
  is fine and `postcss.config.js` is the right config name for v3.
- **No `gh` CLI on this machine.** Use raw `git push` / `git fetch` and edit
  PRs in the browser.
- **`Button/Filter_emission_sys.png`** is the *only* category button asset
  shipped. Inline SVGs in
  [`CategoryIcon.tsx`](src/components/CategoryIcon.tsx) are the placeholder.
  Swap when full set arrives.

## Don't do this

- ❌ Render Gregorian years anywhere user-visible. Always use
  `formatThai*` from `@/lib/thai-date`.
- ❌ Call `supabase.from(...).insert/update/delete` from a page — bypasses
  the offline queue.
- ❌ Add `service_role` keys to the client. The anon key + RLS is the design.
- ❌ Mutate `_dirty` flag from UI code; only `repository.ts` and `flush.ts`
  own that flag.
- ❌ Precache the FBX. It's loaded via Workbox runtime CacheFirst on first
  fetch.
- ❌ Use Chrome on iOS to install the PWA. It doesn't work — Safari only.
