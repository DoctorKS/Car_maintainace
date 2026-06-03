# CX-5 Maintenance — PWA

> Personal mobile-first web app (installable on iPhone via PWA) for tracking
> maintenance visits on a **Mazda CX-5 2016 ทะเบียน ขข4699**.
> Thai + English UI, dates in **พุทธศักราช (พ.ศ.)**, Supabase backend with
> row-level security per user, and a full offline-first sync queue.

---

## Table of contents

1. [Tech stack](#tech-stack)
2. [Architecture](#architecture)
3. [Data schema](#data-schema)
4. [Flow charts](#flow-charts)
5. [Project layout](#project-layout)
6. [Setup](#setup)
7. [Install on iPhone](#install-on-iphone)
8. [Verification](#verification)
9. [Open items](#open-items)

---

## Tech stack

| Concern | Choice | Why |
|---|---|---|
| Bundler | **Vite 5** | Best HMR, first-class PWA plugin |
| Framework | **React 18** | Stable pairing with `@react-three/fiber v8` and the wider ecosystem |
| Language | **TypeScript 5** strict | Fewer footguns; `noUnusedLocals` on |
| CSS | **Tailwind v3.4** | Stable; v4 ecosystem still fresh |
| Routing | **react-router-dom v6** | SPA routes + auth guard |
| Server data | **@supabase/supabase-js v2** + **@tanstack/react-query v5** | RQ caches reads; mutations go through `repository.ts` |
| Offline cache | **Dexie v4** + `dexie-react-hooks` | Local mirror of every row, `useLiveQuery` for reads |
| UI state | **Zustand v5** | History month, dashboard page, expanded-part set |
| 3D | **three v0.169** + **@react-three/fiber v8** + **@react-three/drei v9** | `useLoader(FBXLoader)`, `<ContactShadows />`, `<OrbitControls />` |
| Forms | **react-hook-form v7** + **zod v3** | Set up but kept light — `useState` is enough for the small Add form |
| Dates | **date-fns v4** + custom Thai/BE adapter (`src/lib/thai-date`) | No third-party BE locale; we write a tiny wrapper |
| Image upload | native `<input capture="environment">` + **browser-image-compression** | iOS-friendly; no react-dropzone needed for mobile |
| PWA | **vite-plugin-pwa v0.20** (Workbox, `autoUpdate`) | Auto manifest + SW + runtime caching |
| Tests | **Vitest v2** + `@testing-library/react` + `jsdom` | Same engine as Vite |

**Fonts (self-hosted)** — Inter Variable (Latin) + IBM Plex Sans Thai (Thai, `unicode-range U+0E00-0E7F`). Substitute for Universal Sans; swap the woff2 files later if a licensed Universal Sans build arrives.

---

## Architecture

The app is a **client-only PWA** that talks directly to Supabase over HTTPS using
the user's JWT. There is no app server. All policy enforcement lives in
**Postgres RLS** (`auth.uid() = user_id` on every table). Offline correctness
comes from a **write-through repository** that writes Dexie first, queues a
mutation, then drains the queue against Supabase with idempotent upserts.

```mermaid
flowchart TB
    subgraph Device["iPhone (PWA / Safari standalone)"]
        UI["React 18 UI<br/>(pages + components)"]
        SW["Workbox Service Worker<br/>app shell + FBX + textures"]
        RQ["TanStack Query<br/>(read caching)"]
        Repo["Repository façade<br/>(src/lib/sync/repository.ts)"]
        Dexie[("Dexie / IndexedDB<br/>mirror + _dirty flags")]
        PendMut["pending_mutations<br/>(FIFO queue)"]
        PendUp["pending_uploads<br/>(receipt blobs)"]
        Flush["Flush loop<br/>online + backoff"]
        Pull["Delta pull<br/>(updated_at > lastSyncedAt)"]
        Three["CarViewer (lazy)<br/>three.js + FBXLoader"]
    end

    subgraph Cloud["Supabase"]
        Auth["Supabase Auth<br/>(JWT, email+password)"]
        PG[("Postgres tables<br/>+ RLS auth.uid()=user_id")]
        ST[("Storage: receipts bucket<br/>(uid)/(visit)/(uuid).jpg")]
        Trig["on_auth_user_created<br/>seed vehicle + 2 centers"]
    end

    UI --> RQ
    UI --> Repo
    Repo --> Dexie
    Repo --> PendMut
    Repo --> PendUp
    UI -- "useLiveQuery" --> Dexie
    UI --> Three

    Flush -- "upsert (user_id,local_uuid)" --> PG
    Flush --> ST
    PendMut --> Flush
    PendUp --> Flush
    Pull --> PG
    Pull --> Dexie

    SW -. "CacheFirst /models/*.fbx,<br/>/textures/*.png" .-> Device
    SW -. "NetworkFirst Supabase REST" .-> PG

    Auth -- JWT --> Repo
    Auth --> Trig
    Trig --> PG
```

**Key invariants:**

- **Mutations never block on network.** UI sees the new row the moment the Dexie
  transaction commits. The flush loop drains the queue asynchronously.
- **Idempotency** via `(user_id, local_uuid)` unique constraints on the two
  high-volume tables (`maintenance_visits`, `maintenance_items`). Replays are
  safe.
- **RLS is the only ACL.** Even if the client were compromised, RLS prevents
  cross-user reads/writes.
- **The 3D viewer is `React.lazy`-loaded** so the login / non-dashboard routes
  don't pay the ~880 KB three.js cost.
- **FBX (6 MB) is excluded from precache** and loaded via runtime `CacheFirst`
  to keep the SW install under 5 MB.

---

## Data schema

5 user-scoped tables + 1 storage bucket. RLS policies on every table:
`select / insert / update / delete using (user_id = auth.uid()) with check (user_id = auth.uid())`.

```mermaid
erDiagram
    AUTH_USERS ||--o{ VEHICLES : owns
    AUTH_USERS ||--o{ SERVICE_CENTERS : owns
    AUTH_USERS ||--o{ MAINTENANCE_VISITS : owns
    AUTH_USERS ||--o{ MAINTENANCE_ITEMS : owns
    AUTH_USERS ||--o{ CUSTOM_PARTS : owns
    VEHICLES ||--o{ MAINTENANCE_VISITS : "has visits"
    SERVICE_CENTERS ||--o{ MAINTENANCE_VISITS : "performed at"
    MAINTENANCE_VISITS ||--o{ MAINTENANCE_ITEMS : "contains parts"

    AUTH_USERS {
        uuid id PK
        text email
    }
    VEHICLES {
        uuid id PK
        uuid user_id FK
        text plate
        text model
        int year
        int mileage
        timestamptz updated_at
    }
    SERVICE_CENTERS {
        uuid id PK
        uuid user_id FK
        text name
        bool is_default
    }
    MAINTENANCE_VISITS {
        uuid id PK
        uuid local_uuid UK
        uuid user_id FK
        uuid vehicle_id FK
        uuid service_center_id FK
        date service_date
        int mileage
        text receipt_image_path
        text notes
        timestamptz updated_at
    }
    MAINTENANCE_ITEMS {
        uuid id PK
        uuid local_uuid UK
        uuid visit_id FK
        uuid user_id FK
        smallint category_code "1..6"
        text part_name
        numeric quantity
        numeric total_price
    }
    CUSTOM_PARTS {
        uuid id PK
        uuid user_id FK
        smallint category_code "1..6"
        text part_name
        UK "user_id+category_code+part_name"
    }
```

**Category codes** (per `Maintainance_pattern.txt`):

| Code | Title (Thai) | English |
|---|---|---|
| 1 | ของเหลวและสารหล่อลื่น | Fluids & Lubricants |
| 2 | ระบบไอดี ไอเสีย และไส้กรอง | Filters & Emission System |
| 3 | ระบบไฟและชิ้นส่วนเฉพาะเครื่องยนต์ดีเซล | Engine & Electrical |
| 4 | ช่วงล่าง เบรก และยาง | Chassis, Brakes & Tires |
| 5 | ชิ้นส่วนสิ้นเปลือง | General Consumables |
| 6 | อื่นๆ | Others |

Defined in [`src/lib/categories.ts`](src/lib/categories.ts) with seed `partName`
options for each dropdown. User-added parts persist in `custom_parts` and merge
into the dropdown next time.

**New-user seed trigger** (`handle_new_user`, in
[`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql)) inserts
on `auth.users` insert:

- 1 × `vehicles` — `('ขข4699', 'Mazda CX-5', 2016, 0)`
- 2 × `service_centers` — `'Mazda จันทบุรี'` + `'Mazda ระยอง'` (both `is_default=true`)

**Storage bucket `receipts`** is private. Path:
`<auth.uid()>/<visit_id>/<uuid>.jpg`. Object-level RLS:
`(storage.foldername(name))[1] = auth.uid()::text`.

---

## Flow charts

### 1. Adding a maintenance record (online and offline)

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant P as AddMaintenancePage
    participant R as repository.insertVisit
    participant D as Dexie
    participant Q as pending_mutations
    participant F as flush.ts
    participant S as Supabase

    U->>P: pick date, mileage, items, optional photo
    P->>P: compressImage() (≤1 MB, 1600 px)
    P->>R: insertVisit(userId, draft)
    activate R
    R->>R: generate visit.id, items[].id, local_uuids
    R->>D: tx.put visit + bulkPut items (_dirty=1)
    R->>Q: enqueue insert(visits) + insert(items)
    R->>Q: enqueue pending_uploads (if photo)
    R-->>P: { visitId, pendingReceipt }
    deactivate R
    P-->>U: navigate to "/" (card already visible)

    R->>F: scheduleFlush()
    alt online
        F->>S: POST /rest/v1/maintenance_visits<br/>upsert onConflict=user_id,local_uuid
        S-->>F: 201 + row
        F->>D: put({...row, _dirty:0})
        F->>Q: delete mutation
        F->>S: POST /storage/v1/receipts (if blob)
        F->>D: patch receipt_image_path, enqueue update
    else offline / 5xx
        F->>Q: attempts++, backoff(2^n, cap 30s)
        Note over F,Q: retried on online/visibility/focus events
    end
```

### 2. Delta pull on login + after every flush

```mermaid
sequenceDiagram
    autonumber
    participant A as App boot / sign-in
    participant P as pull.ts
    participant M as meta.lastSyncedAt
    participant S as Supabase
    participant D as Dexie

    A->>P: pullAll()
    P->>M: read lastSyncedAt (default 1970-01-01)
    par parallel selects
        P->>S: select * from vehicles where updated_at >= since
        P->>S: select * from service_centers where created_at >= since
        P->>S: select * from maintenance_visits where updated_at >= since
        P->>S: select * from maintenance_items where created_at >= since
        P->>S: select * from custom_parts where created_at >= since
    end
    S-->>P: rows (RLS already filtered by auth.uid())
    P->>D: bulkPut(rows.map(r => ({...r, _dirty:0})))
    P->>M: write new lastSyncedAt = now()
```

### 3. User journey

```mermaid
flowchart LR
    A([Open app]) --> B{Session?}
    B -- no --> L[/login/]
    L -->|sign in| D
    B -- yes --> D[/Dashboard/]

    D -->|tap '+ เพิ่มข้อมูล'| ADD[/Add maintenance/]
    D -->|tap 'ประวัติ'| H[/History calendar/]
    D -->|tap category| BP[/By-part/]
    D -->|tap mileage| MI[Edit mileage inline]
    D -->|tap card receipt| R[/Receipt modal/]

    ADD -->|save| D
    H -->|tap day w/ red dot| HC[Day's cards]
    BP -->|tap part| TL[Timeline of dates+price]
```

### 4. Auth + RLS

```mermaid
sequenceDiagram
    participant B as Browser
    participant SA as Supabase Auth
    participant P as Postgres + RLS

    B->>SA: POST /auth/v1/token<br/>grant_type=password
    SA-->>B: JWT (access + refresh)
    B->>B: supabase-js stores JWT in localStorage
    Note over B: every subsequent request<br/>carries Authorization: Bearer <JWT>

    B->>P: select * from maintenance_visits
    Note over P: RLS rewrites WHERE clause:<br/>user_id = auth.uid()
    P-->>B: only this user's rows
```

---

## Project layout

```
public/
  models/Mazda_HiPoly.fbx         3D model (runtime CacheFirst)
  textures/{lights,tire,tire_N}.png
  fonts/                          Inter Variable + IBM Plex Sans Thai (self-hosted)
  icons/                          PWA icons (192/512/maskable/apple-touch-180)
  favicon.svg

src/
  main.tsx, App.tsx, router.tsx, index.css, test-setup.ts

  types/
    db.ts                         Hand-written DB row types (mirrors SQL schema)
    domain.ts                     UI-level types (e.g. MaintenanceVisitWithItems)

  lib/
    supabase/{client,session}.ts  createClient + useSession hook
    sync/
      db.ts                       Dexie schema + clearLocalUserData
      queue.ts                    enqueue() + pendingCount()
      flush.ts                    drain loop + backoff + listeners
      pull.ts                     delta pull
      repository.ts               write-through façade (used by all UI mutations)
    thai-date/index.ts            BE conversion + 7 formatters (+ 16 unit tests)
    categories.ts                 6 categories + seed parts from Maintainance_pattern.txt
    image.ts                      compressImage() (≤1 MB / 1600 px)

  three/
    CarViewer.tsx                 lazy-loaded; transparent Canvas, OrbitControls
    useCarModel.ts                FBX load + mesh-name → texture mapping
    inspect-fbx.md                Notes for one-time mesh-name confirmation

  hooks/
    useOnlineStatus.ts            navigator.onLine + pending count + last error
    useVehicle.ts                 Current user's primary vehicle
    useMaintenanceVisits.ts       Pageable visits + visits-in-range + date-set
    useByPart.ts                  Items grouped by part_name with timeline
    useCustomParts.ts             useServiceCenters + useCustomParts(category)
    useReceiptUrl.ts              Signed-URL cache for receipt images

  store/ui.ts                     Zustand: historyMonth, dashboardPage, expandedParts

  pages/
    LoginPage.tsx                 Email + password, iOS "Add to Home Screen" hint
    DashboardPage.tsx             Header + 3D + mileage overlay + categories + history link + recent cards
    AddMaintenancePage.tsx        Thai date picker, 6 collapsible category sections, receipt upload
    HistoryCalendarPage.tsx       Thai calendar w/ red dots, day card on tap
    ByPartPage.tsx                Drill-in to category, tap part → timeline

  components/
    AppShell.tsx                  Safe-area-aware wrapper
    AuthGuard.tsx                 Redirects to /login when session is null
    OfflineBadge.tsx              Top-right floating chip (queue + offline + error)
    MileageOverlay.tsx            Inline-editable mileage on the 3D viewer
    CategoryButtonGrid.tsx        3×2 grid → /by-part/:code
    CategoryIcon.tsx              Inline SVG glyphs for the 6 categories
    MaintenanceCard.tsx           Single visit card with sub-card items
    MaintenanceCardList.tsx       Paginated card list
    ReceiptImageButton.tsx        Opens ReceiptModal
    ReceiptModal.tsx              Signed-URL image viewer
    ThaiDatePicker.tsx            Input + popover ThaiCalendar
    ThaiCalendar.tsx              Month grid w/ red dots + Thai weekday labels
    PartDropdown.tsx              Select existing part or "+ อื่นๆ" inline-add
    ServiceCenterDropdown.tsx     Same pattern for service centers
    CategorySection.tsx           Collapsible category w/ qty + ราคา rows
    Spinner.tsx

supabase/
  migrations/0001_init.sql        Tables + RLS + new-user trigger + storage bucket
```

---

## Setup

### 1. Install + env

```bash
npm install
cp .env.example .env.local         # fill in VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
```

### 2. Provision Supabase

1. Create a project at https://supabase.com.
2. Copy the API URL + `anon` public key into `.env.local`.
3. Supabase dashboard → SQL editor → paste & run
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).
4. Authentication → Providers → enable **Email**.

Or via [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
supabase login
supabase link --project-ref YOUR_REF
supabase db push
```

### 3. Dev / build

```bash
npm run dev           # http://localhost:5173
npm run build         # production bundle in dist/
npm run preview       # serve dist locally
npm test              # vitest unit tests (16 thai-date tests)
npm run typecheck     # tsc --noEmit
```

---

## Install on iPhone

1. Deploy `dist/` to any static host (Vercel, Netlify, Cloudflare Pages…).
2. iPhone → open the URL in **Safari** (Chrome can't install PWAs on iOS).
3. Tap **Share** → **เพิ่มลงหน้าจอหลัก** ("Add to Home Screen").
4. Launch the icon → opens standalone, translucent navy status bar.

The first launch downloads the 6 MB FBX into the Workbox `fbx-models` cache;
subsequent launches load it offline.

---

## Verification

### Local end-to-end

1. `npm run dev`; sign up at `/login`.
2. Confirm the `handle_new_user` trigger seeded a vehicle + 2 service centers
   (check Supabase Studio).
3. Add a visit dated today — every visible date should render as พ.ศ.
4. **Offline replay**: DevTools → Application → Service Workers → Offline.
   Add a second visit; it appears immediately in the dashboard.
   Re-enable network; within ≤ 5 s the new row appears in Postgres and Dexie
   `pending_mutations` is empty.

### Unit tests

```
npm test
✓ src/lib/thai-date/index.test.ts (16 tests)
  - BE conversion (toBE / fromBE)
  - all 7 formatters (short, shortMonth, medium, long, BE year, monthYear)
  - leap year (29 ก.พ. 2567), 1 ม.ค., 31 ธ.ค.
  - Thai numerals (๐-๙)
  - weekdays (อา. / อาทิตย์)
  - ISO date round-trips
```

### RLS cross-check

With two test users A and B, sign in as B and attempt:

```sql
insert into maintenance_visits (user_id, vehicle_id, service_date, mileage, ...)
values (<A.id>, ..., '2026-06-03', 12345);
```

This must fail with a policy violation. Symmetric `select` returns only the
caller's rows.

### Lighthouse PWA audit

Run Chrome DevTools → Lighthouse → PWA. Target ≥ 90.

---

## Open items

1. **Button assets** — the repo contains
   [`Button/Filter_emission_sys.png`](Button/Filter_emission_sys.png), only one
   of the six category buttons. Until the full set lands,
   [`CategoryIcon.tsx`](src/components/CategoryIcon.tsx) renders inline SVGs as
   placeholders. To swap, drop PNG/SVG files into `public/icons/categories/`
   and import them in `CategoryIcon`.
2. **FBX mesh-name mapping** — texture substring rules in
   [`useCarModel.ts`](src/three/useCarModel.ts) (`/tire|wheel/`, `/light|lamp/`,
   etc.) need one-time confirmation against the actual mesh names of the
   shipped FBX. See [`src/three/inspect-fbx.md`](src/three/inspect-fbx.md) for
   the inspection snippet.
3. **Universal Sans license** — using Inter + IBM Plex Sans Thai as a free
   substitute. To switch to a licensed Universal Sans build, replace the woff2
   files in `public/fonts/` and update the `@font-face` family names in
   [`src/index.css`](src/index.css).
4. **`gh` CLI not installed** — pushing to GitHub uses raw `git push`; there's
   no PR / issue tooling configured locally.
