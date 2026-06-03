import { useEffect, useMemo, useRef, useState } from 'react';
import { getCategory, type CategoryCode } from '@/lib/categories';
import { useCustomParts } from '@/hooks/useCustomParts';
import { insertCustomPart } from '@/lib/sync/repository';

interface Props {
  userId: string;
  categoryCode: CategoryCode;
  value: string;
  onChange: (next: string) => void;
}

const OTHER = '__other__';

/**
 * Select an existing part name OR add a new one via "+ อื่นๆ".
 * Custom additions persist to `custom_parts` and reappear in future dropdowns.
 *
 * iOS-safe focus:
 *   - `autoFocus` is unreliable in iOS Safari when the input is mounted
 *     after an async setState (the user gesture from the <select> picker
 *     has already lapsed). We focus imperatively via a ref + useEffect.
 *
 * Explicit commit / cancel buttons:
 *   - The previous `onBlur={commitAdd}` dismissed the input the moment iOS
 *     stole focus (e.g. during the picker-close animation), making it
 *     impossible to type. The user now confirms with "เพิ่ม" / Enter or
 *     cancels with "ยกเลิก" / Escape.
 */
export default function PartDropdown({ userId, categoryCode, value, onChange }: Props) {
  const cat = getCategory(categoryCode);
  const custom = useCustomParts(userId, categoryCode);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!adding) return;
    // Defer to after layout commits so iOS Safari accepts the focus call.
    const id = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [adding]);

  const options = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const p of [...cat.seedParts, ...custom]) {
      if (!seen.has(p)) {
        seen.add(p);
        out.push(p);
      }
    }
    return out;
  }, [cat.seedParts, custom]);

  const startAdd = () => {
    setDraft('');
    setAdding(true);
  };

  const cancelAdd = () => {
    setDraft('');
    setAdding(false);
  };

  const commitAdd = async () => {
    const name = draft.trim();
    if (!name) return; // stay in editing mode — don't silently dismiss
    await insertCustomPart(userId, categoryCode, name);
    onChange(name);
    setDraft('');
    setAdding(false);
  };

  if (adding) {
    return (
      <div className="flex min-w-0 flex-1 gap-1">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void commitAdd();
            } else if (e.key === 'Escape') {
              cancelAdd();
            }
          }}
          placeholder="ชื่ออะไหล่ใหม่..."
          className="min-w-0 flex-1 rounded-tile bg-white px-2 py-2 text-sm text-ink outline-none ring-2 ring-brand"
        />
        <button
          type="button"
          onClick={() => void commitAdd()}
          className="rounded-tile bg-brand px-2.5 py-2 text-xs font-semibold text-white disabled:opacity-40"
          disabled={draft.trim().length === 0}
        >
          เพิ่ม
        </button>
        <button
          type="button"
          onClick={cancelAdd}
          className="rounded-tile bg-line px-2 py-2 text-xs font-medium text-ink"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <select
      value={value}
      onChange={(e) => {
        if (e.target.value === OTHER) {
          startAdd();
        } else {
          onChange(e.target.value);
        }
      }}
      className="min-w-0 flex-1 rounded-tile bg-white px-2 py-2 text-sm text-ink outline-none ring-1 ring-line focus:ring-2 focus:ring-brand"
    >
      <option value="">— เลือกอะไหล่ —</option>
      {options.map((p) => (
        <option key={p} value={p}>
          {p}
        </option>
      ))}
      <option value={OTHER}>+ อื่นๆ…</option>
    </select>
  );
}
