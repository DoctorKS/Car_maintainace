# BUGS.md — Car-maintenance bug log

> Append-only log. Newest at the bottom. Four mandatory fields per entry in Thai —
> see [`.claude/skills/engineering/bug-log/SKILL.md`](.claude/skills/engineering/bug-log/SKILL.md)
> for the format and the discipline rules. Edit prior entries → never; add a
> correcting entry instead.

---

## 2026-06-04 — pull-guard tombstone race
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
