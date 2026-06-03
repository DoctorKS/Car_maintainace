import { useMemo, useState } from 'react';
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
 */
export default function PartDropdown({ userId, categoryCode, value, onChange }: Props) {
  const cat = getCategory(categoryCode);
  const custom = useCustomParts(userId, categoryCode);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');

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

  const commitAdd = async () => {
    const name = draft.trim();
    if (!name) {
      setAdding(false);
      return;
    }
    await insertCustomPart(userId, categoryCode, name);
    onChange(name);
    setDraft('');
    setAdding(false);
  };

  if (adding) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commitAdd}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commitAdd();
          else if (e.key === 'Escape') {
            setDraft('');
            setAdding(false);
          }
        }}
        placeholder="พิมพ์ชื่ออะไหล่..."
        className="min-w-0 flex-1 rounded-tile bg-white px-2 py-2 text-sm text-ink outline-none ring-2 ring-brand"
      />
    );
  }

  return (
    <select
      value={value}
      onChange={(e) => {
        if (e.target.value === OTHER) {
          setAdding(true);
          setDraft('');
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
