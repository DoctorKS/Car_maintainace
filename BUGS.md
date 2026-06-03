# BUGS.md — Car-maintenance bug log

> Append-only log. Newest at the bottom. Four mandatory fields per entry in Thai —
> see [`.claude/skills/engineering/bug-log/SKILL.md`](.claude/skills/engineering/bug-log/SKILL.md)
> for the format and the discipline rules. Edit prior entries → never; add a
> correcting entry instead.

---

## 2026-06-03 — vercel-vite-command-not-found
**Commit:** [`d2ae3e9`](https://github.com/DoctorKS/Car_maintainace/commit/d2ae3e9)
**Files:** `vercel.json`, `.env.production`

### 1. ปัญหาที่เกิด
Build บน Vercel ล้มเหลวด้วย log
`Running "install" command: 'npm run dev'... sh: line 1: vite: command not found · Error: Command "npm run dev" exited with 127`

### 2. Root cause
ใน Vercel Project Settings → Build & Development Settings มี Install Command override ถูกตั้งเป็น `npm run dev` (ซึ่งเรียก `vite` ตรงๆ) แต่ Vercel ยังไม่ได้รัน `npm install` มาก่อน → ไม่มี `node_modules/.bin/vite` ให้เรียก ขั้นตอน install ของ Vercel เลย exit 127

### 3. Process (ทำไมจาก root cause ถึงเกิดปัญหา)
1. Vercel ดู Project Settings → Install Command override = `npm run dev` (ไม่ทราบใครตั้งหรือเมื่อไหร่)
2. Vercel เริ่มไปที่ขั้นตอน install → spawn shell ที่ยังไม่มี dependencies — ยังไม่ได้รัน `npm install`
3. shell รัน `npm run dev` → npm หา script `dev` ใน package.json → script คือ `vite`
4. shell หา binary `vite` ใน PATH หรือ `node_modules/.bin/` ไม่เจอ (เพราะ node_modules ยังไม่มี)
5. shell คืน exit code 127 (command not found)
6. Vercel มอง exit 127 = install fail → build ล้ม
7. (build command + output dir + framework Vercel ตรวจไม่ถึงด้วย เพราะ install ตายก่อน)

### 4. วิธีการที่แก้
สร้าง [`vercel.json`](vercel.json) ใน repo root pin ค่าทั้งหมดที่ Vercel ใช้:
- `installCommand: "npm install"`
- `buildCommand: "npm run build"`
- `outputDirectory: "dist"`
- `framework: "vite"`
- SPA `rewrites` ที่กัน assets / fonts / icons / models / textures / favicon / manifest / sw / workbox ไม่ให้ fallback ไป index.html
- `headers` ตั้ง long-cache ให้ `/assets`, `/fonts`, `/models`, `/textures`; no-cache + `Service-Worker-Allowed: /` ให้ `sw.js`

vercel.json override ค่า UI โดยปริยาย — ครั้งถัดมาที่ Vercel deploy commit นี้ install command กลับมาเป็น `npm install` ถูกต้อง พร้อมเพิ่ม [`.env.production`](.env.production) ให้ Vite inject `VITE_SUPABASE_*` ตอน build (Vite ไม่อ่าน `.env.example`).

Pushed [`d2ae3e9`](https://github.com/DoctorKS/Car_maintainace/commit/d2ae3e9).

---

## 2026-06-03 — category-png-2mb-bloat
**Commit:** [`0f3cd91`](https://github.com/DoctorKS/Car_maintainace/commit/0f3cd91)
**Files:** `public/icons/categories/cat-1.png` ... `cat-6.png`, `src/components/CategorySection.tsx`

### 1. ปัญหาที่เกิด
User บอก "ใช้รูปใน /Button ในหน้าเพิ่มข้อมูล" — wiring ถูก แต่ icons เหมือนไม่ขึ้น/โหลดช้ามาก ทำให้ user คิดว่าไม่ได้ apply

### 2. Root cause
ไฟล์ใน [`public/icons/categories/`](public/icons/categories/) เป็น copy ตรงของ `/Button/*.png` ขนาด **2.0–2.3 MB ต่อไฟล์** (รวม ~12 MB) ในขณะที่ render เป็น icon 32 px เท่านั้น

### 3. Process (ทำไมจาก root cause ถึงเกิดปัญหา)
1. Earlier commit copy `/Button/*.png` → `public/icons/categories/cat-N.png` ตรงๆ ด้วย `cp` (ไม่ resize ไม่ optimize)
2. `<CategoryIcon code={n}>` render `<img src="/icons/categories/cat-N.png" class="h-8 w-8">` → browser ต้องดึงไฟล์ 2 MB ผ่าน network
3. ระหว่างที่ browser fetch ภาพ (อาจหลายวินาทีบน 4G/Wi-Fi อ่อน) `<img>` แสดง alt text + ขนาด 32 px ว่าง — ดูเหมือน icon ไม่โผล่
4. หลังโหลดเสร็จ browser ย่อ image ลง 32 px แสดง (เสีย bandwidth + memory เปล่า)
5. User refresh / ทดสอบ → icons "เพิ่งโผล่" → คิดว่ายังไม่ได้ apply file

### 4. วิธีการที่แก้
รัน Pillow script resize ทุกไฟล์ longest side = 256 px + `optimize=True` save PNG:
- cat-1 2081 → 10 KB · cat-2 2205 → 19 KB · cat-3 2152 → 15 KB
- cat-4 2204 → 16 KB · cat-5 404 → 56 KB · cat-6 2149 → 13 KB
- รวม 9 MB → **148 KB** (ลด 60×)

256 px พอสำหรับ retina @3× (display 84 px) ไม่เสีย quality แล้วขยายไอคอนใน [`CategorySection`](src/components/CategorySection.tsx) header chip 40 → 56 px ให้ user เห็นชัดว่าไอคอนถูก wire จริง

Pushed [`0f3cd91`](https://github.com/DoctorKS/Car_maintainace/commit/0f3cd91).

---

## 2026-06-03 — ios-other-input-cant-type
**Commit:** [`eff8971`](https://github.com/DoctorKS/Car_maintainace/commit/eff8971)
**Files:** `src/components/PartDropdown.tsx`, `src/components/ServiceCenterDropdown.tsx`

### 1. ปัญหาที่เกิด
"Drop down '+อื่นๆ' กดแล้วมี bug ไม่ยอมให้ user กรอกข้อมูล" บน iPhone Safari — เลือก "+ อื่นๆ" ใน `<select>` แล้วช่อง input เด้งมาแต่ keyboard ไม่ขึ้น หรือเด้งมาแว้บเดียวแล้ว input หายเลย

### 2. Root cause
ตอนนั้นใน [`PartDropdown.tsx`](src/components/PartDropdown.tsx) และ [`ServiceCenterDropdown.tsx`](src/components/ServiceCenterDropdown.tsx) ใช้ `<input autoFocus>` ซึ่ง iOS Safari **เพิกเฉย** ถ้า focus call ไม่ได้อยู่ใน synchronous user-gesture handler บวกกับ `onBlur={commitAdd}` ที่ commit-แล้ว-ปิดทันทีเมื่อ focus หลุด

### 3. Process (ทำไมจาก root cause ถึงเกิดปัญหา)
1. User แตะ `<select>` → iOS เปิด native picker (drum-roll)
2. User เลือก "+ อื่นๆ" → picker ปิด → `onChange` ของ select ฟายร์ async หลัง picker animation
3. handler เรียก `setAdding(true)` + `setDraft('')` → React schedule re-render (async)
4. Render รอบใหม่ → `<input autoFocus />` mount
5. iOS Safari เช็คว่า focus call นี้อยู่ใน user-gesture context ทันที — ไม่อยู่ (กว่าจะถึง render rounds ของ React user-gesture หมดอายุไปแล้ว) → ignore autoFocus → keyboard ไม่เด้ง
6. ถ้า iOS เผลอ shift focus ระหว่าง picker close animation → `onBlur={commitAdd}` ฟายร์ → draft ว่าง → `setAdding(false)` → input unmount หาย
7. User เห็น input โผล่แว้บแล้วหาย หรือเห็น input แต่พิมพ์ไม่ได้

### 4. วิธีการที่แก้
- เปลี่ยน `autoFocus` → `useRef` + `useEffect(() => { setTimeout(() => inputRef.current?.focus(), 0) }, [adding])` — focus run หลัง layout commit, iOS ยอม
- ลบ `onBlur={commitAdd}` ออก
- เพิ่มปุ่ม **"เพิ่ม"** (commit) + **"✕"** (cancel) ให้ user สั่งเอง keep `Enter` / `Escape` เป็น keyboard shortcut

Pattern เดียวกัน apply ทั้ง `PartDropdown` และ `ServiceCenterDropdown`.

Pushed [`eff8971`](https://github.com/DoctorKS/Car_maintainace/commit/eff8971).

---

## 2026-06-03 — price-input-cant-clear-zero
**Commit:** [`ce3c6a6`](https://github.com/DoctorKS/Car_maintainace/commit/ce3c6a6)
**Files:** `src/components/CategorySection.tsx`

### 1. ปัญหาที่เกิด
"field กรอกราคาไม่สามารถลบเลข 0 ได้" — user เปิดฟอร์ม ช่อง ราคา / จำนวน / ราคารวม แสดง "0" backspace ลบไม่ออก พิมพ์เลขจริง (เช่น 1500) ติดอยู่ที่ "0" หรือ "01500"

### 2. Root cause
ใน [`CategorySection.tsx`](src/components/CategorySection.tsx) controlled `<input type="number" value={number}>` กับ state default `0` รวมกับ `onChange={(e) => setX(Number(e.target.value) || 0)}` — กลายเป็น loop: user ลบ → state กลับเป็น 0 → input โชว์ 0 อีก

### 3. Process (ทำไมจาก root cause ถึงเกิดปัญหา)
1. blank row default `quantity: 1, unitPrice: 0, totalPrice: 0`
2. `<input type="number" value={it.totalPrice}>` → DOM แสดง `"0"`
3. User กด backspace → input value="" → `onChange` event ฟายร์ → `e.target.value === ""`
4. handler ทำ `Number("") || 0` → `NaN || 0` → `0` → `setX(0)`
5. state ยังคง 0 → controlled component re-render → input value กลับเป็น 0 → DOM แสดง "0" อีก
6. User พิมพ์ "1" ทับ → input value="1" → `Number("1") || 0` → 1 → state 1 → input โชว์ "1" (OK) **แต่** ถ้า user พิมพ์ก่อนลบ 0 จะได้ "01" → `Number("01")` = 1 (ok) แต่ลำดับ keystrokes ทำให้ user งง
7. User สรุปว่า "ลบเลข 0 ไม่ออก"

### 4. วิธีการที่แก้
สร้าง helper 2 ตัวใน [`CategorySection.tsx`](src/components/CategorySection.tsx):
- `displayNum(n)` คืน `''` เมื่อ `n === 0` (placeholder `0` จาก HTML attribute โผล่แทน)
- `parseNum(raw)` คืน `0` เมื่อ `''` / `NaN`, clamp non-negative

ใช้กับทั้ง 3 ช่อง (จำนวน / ราคา/ชิ้น / ราคารวม):
```tsx
value={displayNum(it.totalPrice)}
onChange={(e) => update(idx, { totalPrice: parseNum(e.target.value) })}
placeholder="0"
```

ผลลัพธ์: input ว่างจริงๆ ตอน state = 0 user ลบ "0" ออกเหลือ "" → state ยัง 0 → placeholder "0" โผล่ → user พิมพ์ "1500" ติดเข้าทันที

Pushed [`ce3c6a6`](https://github.com/DoctorKS/Car_maintainace/commit/ce3c6a6).

---

## 2026-06-03 — edit-form-hydration-ref-stuck
**Commit:** [`5c0badc`](https://github.com/DoctorKS/Car_maintainace/commit/5c0badc)
**Files:** `src/pages/AddMaintenancePage.tsx`

### 1. ปัญหาที่เกิด
User report กว้างๆ ว่า "ข้อมูลไม่ขึ้น" หนึ่งใน hypothesis คือ: tap pencil บน visit A → `/edit/A` form โหลดข้อมูล A ปกติ → กลับ dashboard → tap pencil บน visit B → `/edit/B` แต่ form แสดงข้อมูล A เดิม (visitId เปลี่ยน url แต่ field ค่ายังเก่า)

### 2. Root cause
ใน [`AddMaintenancePage.tsx`](src/pages/AddMaintenancePage.tsx) ใช้ `useRef` (`seededFromVehicle` + `seededFromExisting`) กัน `useEffect` hydration ไม่ให้รันซ้ำตอน `existing` (จาก Dexie) เปลี่ยน — แต่ ref ไม่ถูก reset เมื่อ `visitId` ใน URL เปลี่ยน → component instance เดียวกัน, ref ยัง `true` อยู่ → effect skip → form ค้างค่าเก่า

### 3. Process (ทำไมจาก root cause ถึงเกิดปัญหา)
1. User route `/edit/A` → AddMaintenancePage mount → `visitId = "A"`, `existing` = null ครั้งแรก
2. `useVisitWithItems("A")` ทำ Dexie query → return visit A
3. `useEffect` ที่ hydrate ฟอร์มรัน (deps `[editing, existing]`) → seededFromExisting.current = false → `setDate(A.date)`, `setMileage(A.mileage)`, ... → seededFromExisting.current = **true**
4. User edit ใน form แล้วกลับ dashboard → ไม่ได้ navigate ออกจาก React tree, AddMaintenancePage **stays mounted** (react-router แค่ swap)
5. User tap pencil บน B → route เปลี่ยนเป็น `/edit/B` → `useParams().visitId = "B"`
6. useVisitWithItems re-query → existing = visit B
7. useEffect ฟายร์ (deps เปลี่ยน) → check `seededFromExisting.current` = **true** จาก step 3 → bail
8. Form ค้างค่า A ไว้ user เห็นว่า edit B แต่ฟิลด์ทั้งหมดเป็นของ A

### 4. วิธีการที่แก้
เพิ่ม useEffect แยกที่ reset ทั้ง refs ทุกครั้ง `visitId` เปลี่ยน:
```ts
useEffect(() => {
  seededFromVehicle.current = false;
  seededFromExisting.current = false;
}, [visitId]);
```

ครั้งถัดไปที่ hydration effect ฟายร์ — ref กลับเป็น false → effect run → form re-hydrate ด้วยข้อมูล B จริงๆ ในชุดเดียวกันยัง revert/improve defensive fix อีก 2 อย่าง: pullAll ที่ Dashboard mount + console.error logging ที่เห็นใน DevTools

Pushed [`5c0badc`](https://github.com/DoctorKS/Car_maintainace/commit/5c0badc).

---

## 2026-06-03 — supabase-data-not-syncing-missing-notes-column
**Commit:** [`8a24427`](https://github.com/DoctorKS/Car_maintainace/commit/8a24427)
**Files:** `src/lib/sync/schema-probe.ts`, `src/lib/sync/flush.ts`, `src/main.tsx`

### 1. ปัญหาที่เกิด
"User กรอกข้อมูลแล้วข้อมูลไม่ขึ้น supabase" — Dexie เก็บ row ที่ user กรอก UI แสดงข้อมูลครบ แต่เปิด Supabase Studio table ว่างเปล่า / ไม่มี row ใหม่เลย

### 2. Root cause
Commit [`ce3c6a6`](https://github.com/DoctorKS/Car_maintainace/commit/ce3c6a6) เพิ่ม field `notes` เข้าทุก `maintenance_items` payload + ทิ้ง migration [`0002_item_notes.sql`](supabase/migrations/0002_item_notes.sql) ให้ user รัน manual — user ยังไม่ได้รัน → ทุก item upsert โดน PostgREST reject ด้วย code **42703** "column 'notes' does not exist"

### 3. Process (ทำไมจาก root cause ถึงเกิดปัญหา)
1. User กรอกฟอร์ม + กดบันทึก
2. `repository.insertVisit` สร้าง visit + items ใน Dexie, queue mutations, แล้ว `scheduleFlush()`
3. UI re-render — `useLiveQuery` เห็น row ใหม่ใน Dexie → แสดงทันที (เห็นว่า "เพิ่มสำเร็จ")
4. `flush.applyMutation` upsert `maintenance_visits` → server เห็น columns ตรง schema → INSERT สำเร็จ
5. `flush.applyMutation` upsert `maintenance_items` ตัวแรก → payload มี `notes: null` (เพราะ user ไม่ได้พิมพ์ note)
6. Supabase REST API ตรวจ schema → table ยังไม่มี column `notes` (migration 0002 ไม่ได้รัน) → return 400 + code 42703
7. flush เห็น error → `attempts++` + backoff → schedule retry
8. retry → upsert ตัวเดิมที่มี `notes: null` → server reject เหมือนเดิม → loop ไม่จบ จนกว่า dead-letter ที่ MAX_ATTEMPTS (แต่ตอนนั้น MAX_ATTEMPTS ยังไม่มีด้วย)
9. Dexie row ค้าง `_dirty=1`, queue เต็ม, server ไม่มี item เลย → user เห็น visit อย่างเดียวบน Supabase / หรือไม่เห็นอะไรเลยถ้า visit insert ก็ติด

### 4. วิธีการที่แก้
สร้าง [`schema-probe.ts`](src/lib/sync/schema-probe.ts) — ยิง `select notes from maintenance_items limit 1` ครั้งเดียวหลัง sign-in:
- เจอ error 42703 → state = `'item-notes-missing'`
- expose `hasItemNotes()` getter + `markItemNotesMissing()` setter

ปรับ [`flush.applyMutation`](src/lib/sync/flush.ts) — strip `notes` จาก `maintenance_items` payload เมื่อ:
- value เป็น `null`/`undefined`/`''` (เสมอ — ไม่เสียข้อมูล), หรือ
- schema probe ยืนยันว่า column หาย

ถ้า upsert ยัง fail ด้วย missing-column signature → mark state ก่อน throw → retry ครั้งถัดไปที่ flush drain strip notes โดยอัตโนมัติ ไม่ต้องรอ probe (1 round-trip per session)

เพิ่ม `probeSchema()` call ใน [`main.tsx`](src/main.tsx) boot + ทุกครั้ง SIGNED_IN

Trade-off: ถ้า user ยังไม่รัน 0002, per-item notes ที่ user พิมพ์จะ **เสีย** บน DB (column ไม่มีให้เก็บ) แต่ row ที่เหลือ sync ผ่าน — console.error บอก migration file ให้รัน

Pushed [`8a24427`](https://github.com/DoctorKS/Car_maintainace/commit/8a24427).

---

## 2026-06-04 — pull-guard-tombstone-race
**Commit:** [`750b569`](https://github.com/DoctorKS/Car_maintainace/commit/750b569)
**Files:** `src/lib/sync/pull.ts`, `src/lib/sync/repository.ts`, `src/lib/sync/dedupe.ts`, `src/components/DevToolsDock.tsx`

### 1. ปัญหาที่เกิด
"User กรอกข้อมูล แล้ว app duplicate ข้อมูลขึ้นใน Dexie ซ้ำๆ Supabase ไม่มีการ duplicate ลบเท่าไหร่ก็ duplicate ใหม่"
อาการเด่นสุดคือ user ลบรายการที่ duplicate ใน UI แล้ว row นั้นโผล่กลับมาอีกในการ render รอบถัดไป

### 2. Root cause
`pullAll()` ใน [`src/lib/sync/pull.ts`](src/lib/sync/pull.ts) เรียก `bulkPut` กับทุก row ที่ server คืนกลับมาโดยไม่เช็คว่ามี delete-tombstone ของ id นั้นอยู่ใน `pending_mutations` / `dead_letters` หรือยัง — รัน concurrently กับ flush ที่ยังส่ง delete ไปไม่ถึง Supabase แล้วเขียน row ที่เพิ่งถูกลบกลับเข้า Dexie

### 3. Process (ทำไมจาก root cause ถึงเกิดปัญหา)
1. Commit [`5c0badc`](https://github.com/DoctorKS/Car_maintainace/commit/5c0badc) เพิ่ม "defensive `pullAll()` on Dashboard mount" ทำให้ทุกครั้งที่ user นำทางกลับ `/` ระบบยิง pull ใหม่
2. User กดถังขยะลบ visit V → `deleteVisit` ใน [`repository.ts`](src/lib/sync/repository.ts) ลบ V + items ของ V ออกจาก Dexie แล้ว enqueue `delete(visit V)` ไว้ในคิว (item ไม่ได้ถูก enqueue เพราะอาศัย server CASCADE ลบให้)
3. User กดกลับหน้า dashboard → `DashboardPage` mount → useEffect ยิง `pullAll()` ทันที
4. flush ยังประมวลคิวไม่เสร็จ → Supabase ยังมี V + items I1, I2 อยู่ครบ
5. `pullAll` ถาม `select * gte('created_at', since)` → server คืน I1, I2 (ของ V) มาด้วย
6. `bulkPut(items)` ใน pull insert I1, I2 กลับเข้า Dexie (เพราะ id ของ I1, I2 ไม่มีอยู่ใน Dexie ตอนนี้แล้ว — เพิ่งถูกลบไปตอน step 2)
7. flush รันต่อ → ลบ V บน server → CASCADE ลบ I1, I2 บน server → Supabase สะอาด
8. แต่ Dexie ยังถือ I1, I2 อยู่จาก step 6 → next `useLiveQuery` render → user เห็น items กลับมา
9. user กดลบอีก → process เดิมซ้ำที่ step 2..8 → ghost คาอยู่ตลอด

### 4. วิธีการที่แก้
- เพิ่ม `safeBulkPut()` ใน [`pull.ts`](src/lib/sync/pull.ts) — ก่อน bulkPut ต่อ entity, กรอง id ที่ (ก) อยู่ใน `pending_mutations` เป็น delete op, (ข) อยู่ใน `dead_letters` เป็น delete op, (ค) local row เป็น `_dirty=1` ออก
- ปรับ [`deleteVisit`](src/lib/sync/repository.ts) ให้ enqueue `delete` ของ item แต่ละตัวด้วย (ไม่ใช่แค่ visit) — server ยังใช้ CASCADE แต่ explicit enqueues คือเพื่อให้ pull guard match tombstone ของ items ได้
- เพิ่ม [`dedupe.ts`](src/lib/sync/dedupe.ts) → `dedupeAgainstServer()` ดึง canonical id sets จาก Supabase แล้วลบ local row ที่ id ไม่อยู่ใน server set และไม่ใช่ `_dirty=1` ออก wire เข้า ⬆ Force-resync ใน [`DevToolsDock`](src/components/DevToolsDock.tsx) ให้ user กดปุ่มเดียวเคลียร์ ghost ทุกตัว
- Toast ของ ⬆ รายงาน `cleaned N · kicked M` แยกตามจำนวน

Pushed [`750b569`](https://github.com/DoctorKS/Car_maintainace/commit/750b569).

---
