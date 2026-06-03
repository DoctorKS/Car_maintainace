---
name: bug-log
description: Append a structured entry to BUGS.md every time a bug is fixed in the Car-maintenance PWA. Four mandatory Thai-language fields per entry — (1) ปัญหาที่เกิด, (2) root cause, (3) process (ทำไมจาก root cause ถึงเกิดปัญหา), (4) วิธีการที่แก้. The entry goes in at the bottom of BUGS.md with a date + commit-hash header, no editing of prior entries. Trigger on /bug-log, "บันทึก bug", "add a bug log entry", "log this fix", "record this bug", or proactively the moment a fix is verified and committed in this repo.
---

# Bug log

A discipline gate for THIS repo. Every bug fix that lands gets a fresh entry in `BUGS.md` — not because the commit message isn't searchable, but because the four-field structure forces whoever shipped it to separate **symptom** from **cause** from **mechanism** from **fix**. On a single-developer project the cost of repeating the same bug because nobody traced cause → process is enormous.

Different from [`post-mortem`](../post-mortem/SKILL.md), which was written for the Clinic-calendar repo and writes to `CODEX.md` as one-line change-log entries plus a commit message. This skill is Car-maintenance specific, in Thai, and the output is a longer per-entry block in `BUGS.md`.

## When to invoke

- `/bug-log`
- The user says **"บันทึก bug"** / **"log this fix"** / **"add bug log entry"** / **"record the bug we just fixed"**.
- A debugging session lands a verified fix and a commit has been pushed — **proactively offer**:
  *"Want me to add this to BUGS.md? — `/bug-log`"*

## When NOT to use

- **Fix not verified yet.** Write the log after the user (or a real repro) confirms the symptom is gone. Logging a hypothesis is worse than no log.
- **Pure refactor with no observable bug.** Note in the commit; no BUGS.md entry.
- **One-character typo fix.** Commit message is enough.
- **A change-request feature** ("add VAT 7%") — that's a feature, not a bug. Use a commit message and update README/CLAUDE.

## Required inputs — refuse without these

Before writing a single line, confirm:

- [ ] **The symptom** — what the user (or you) actually saw.
- [ ] **The root cause** — the technical condition the fix removed. One sentence.
- [ ] **The process** — the step-by-step chain from cause to symptom. Numbered.
- [ ] **The fix** — what shipped. Commit hash. Files.

If any is missing, list what's missing and stop. Do not guess.

## The four mandatory fields

Each entry MUST have all four, in this order, in Thai. Do not reorder.

### 1. ปัญหาที่เกิด

What the user saw. In their words if a quote is available. **Symptom only — no analysis yet.**

- ✅ *"User กรอกข้อมูล แล้ว app duplicate, Supabase ไม่มี duplicate, ลบเท่าไหร่ก็มา"*
- ❌ *"Pull was resurrecting deleted rows"* (that's already cause, not symptom)

### 2. Root cause

The single technical condition that the fix removed. **One sentence.** Reference `path/file.ts:line` if useful. If the answer takes five sentences, the analysis is unfinished — finish it before logging.

- ✅ *"`pullAll()` ใช้ `bulkPut` โดยไม่ดู queue tombstones — รัน concurrently กับ delete ที่ยัง flush ไม่เสร็จ → resurrect (`src/lib/sync/pull.ts`)."*
- ❌ *"Something with sync that interacts with pull and delete."*

### 3. Process (ทำไมจาก root cause ถึงเกิดปัญหา)

**Numbered steps** from the root condition to what the user saw. Concrete. Reference functions, queue states, server states, timestamps. This is the field that prevents recurrence: the next reader understands the mechanism, not just the patch.

Rule of thumb: **a 6-step process is normal; a 2-step "1. cause 2. symptom" is wrong** — you skipped the interesting middle.

### 4. วิธีการที่แก้

What changed in code. **Commit hash. Files touched. The principle, not the diff** (the diff lives in git; the principle is what survives a year). End with **"Pushed `<short hash>`"**.

- ✅ *"Add `safeBulkPut()` in `pull.ts` that filters out IDs present in `pending_mutations` / `dead_letters` as a delete op. `deleteVisit` now enqueues an explicit delete per item too. Pushed `750b569`."*
- ❌ *"Changed pull.ts and repository.ts."*

## Where the log lives

Single file: **`BUGS.md`** at the repo root.

- **Newest at the bottom** — like a real log, append-only.
- One H2 (`##`) per entry, in the format `## YYYY-MM-DD — short-slug` (Buddhist year is fine in the body text but the H2 uses ISO date for sortability).
- A line of three dashes (`---`) between entries so the file stays skim-able.
- Cross-reference: link to the commit on GitHub (`https://github.com/DoctorKS/Car_maintainace/commit/<hash>`).

If `BUGS.md` doesn't exist yet, create it with a one-line preface that points back to this skill, then add the entry.

## Entry template

Copy this verbatim and fill the four blocks. Replace `<...>` placeholders only.

```markdown
## <YYYY-MM-DD> — <short-kebab-slug>
**Commit:** [`<short hash>`](https://github.com/DoctorKS/Car_maintainace/commit/<short hash>)
**Files:** `path/to/main.ts`, `path/to/other.ts`

### 1. ปัญหาที่เกิด
<symptom in the user's words; one short paragraph>

### 2. Root cause
<one-sentence technical cause; reference file:line where useful>

### 3. Process (ทำไมจาก root cause ถึงเกิดปัญหา)
1. <step>
2. <step>
3. <step>
... continue numbered until the user sees the symptom ...

### 4. วิธีการที่แก้
<what landed in code — what guard / refactor / rename / migration was added.
Commit-message-style, not diff-style. End with: Pushed `<short hash>`.>

---
```

## Output flow

1. **Confirm the four required inputs are present.** If not, list what's missing and stop.
2. **Append the entry to `BUGS.md`** (don't print-only — append). If the file doesn't exist, create it with a short preface.
3. **Match the existing template exactly** — same headings, same order, same `---` separator. Future Claude will use H2 + heading-level matching to navigate.
4. **Commit the BUGS.md change** with a one-line message:
   `docs(bug-log): <short-slug>` (matches the existing commit style in this repo).
   Push immediately so the log doesn't drift behind the code.
5. **Don't offer to do anything else** — a bug-log entry is one task. If the user wants the README updated too, that's a separate request.

## Operating rules

- **One entry per bug.** Don't merge two bugs into one — each got its own root cause.
- **Process MUST be numbered.** Bullet lists let you skip the boring middle; numbered steps don't.
- **Cite code.** `src/lib/sync/pull.ts:99` is better than "the pull function". Future Claude reads the citation, not the prose.
- **Past tense, what actually happened.** No "should" or "would" — the bug is real; describe reality.
- **No fix-without-cause.** If the fix doesn't follow from the process you wrote, the analysis is incomplete. Say so explicitly: *"Cause unconfirmed; defensive fix only."* Then add a TODO at the bottom of the entry.
- **Append, never edit prior entries.** A log is append-only. If a previous entry was wrong, add a new entry that corrects it (link the prior entry).
- **Thai for the four field bodies, English for code identifiers and commit hashes.** Match how the project comments code.
- **Don't speculate-log.** If the fix is defensive and the cause isn't proven, label it: *"Hypothesis-based fix; awaiting user repro to confirm."*

## Tone

This is engineer-to-future-self, in Thai. Different from `management-talk`:

- **Code identifiers stay in English.** Function names, file paths, commit SHAs, table names. Mixing Thai and English is fine — that's how the codebase comments read.
- **Mechanism over narrative.** Don't soften *"`pullAll()` resurrected the items because it ran before flush"* into *"a sync issue happened"*. Be exact.
- **Active voice, short paragraphs.**
- **No hedging.** *"I think"* / *"maybe"* / *"appears to"* — drop. State it or don't write it.
- **No advocacy.** A log records what happened. If you want to argue for a refactor based on the pattern, file it separately as a TODO at the bottom of `BUGS.md`.

## Anti-patterns to refuse

- An entry that has Sections 1–3 empty and only fills Section 4 ("fix landed in `commit X`") — the whole point is the cause analysis.
- An entry whose Process step 2 is *"and then it broke"* — that's a wave-hand, not a step.
- An entry whose Root cause is *"need more testing"* — that's a process gap, not a cause.
- Editing an old entry instead of appending a correction. Never.
