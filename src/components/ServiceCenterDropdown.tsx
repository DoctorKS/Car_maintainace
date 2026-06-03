import { useEffect, useRef, useState } from 'react';
import { useServiceCenters } from '@/hooks/useCustomParts';
import { insertServiceCenter } from '@/lib/sync/repository';

interface Props {
  userId: string;
  value: string | null; // service_center_id
  onChange: (id: string | null) => void;
}

const OTHER = '__other__';

/**
 * Service-centre dropdown with an "+ อื่นๆ" option that opens an inline
 * text input. Focus + commit handled the same way as PartDropdown — see
 * the comment block there for the iOS rationale.
 */
export default function ServiceCenterDropdown({ userId, value, onChange }: Props) {
  const centers = useServiceCenters(userId);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!adding) return;
    const id = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [adding]);

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
    if (!name) return;
    const row = await insertServiceCenter(userId, name);
    onChange(row.id);
    setDraft('');
    setAdding(false);
  };

  if (adding) {
    return (
      <div className="flex w-full gap-1">
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
          placeholder="ชื่อศูนย์บริการใหม่..."
          className="min-w-0 flex-1 rounded-tile bg-white px-3 py-2.5 text-sm text-ink outline-none ring-2 ring-brand"
        />
        <button
          type="button"
          onClick={() => void commitAdd()}
          disabled={draft.trim().length === 0}
          className="rounded-tile bg-brand px-3 py-2.5 text-xs font-semibold text-white disabled:opacity-40"
        >
          เพิ่ม
        </button>
        <button
          type="button"
          onClick={cancelAdd}
          className="rounded-tile bg-line px-2 py-2.5 text-xs font-medium text-ink"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <select
      value={value ?? ''}
      onChange={(e) => {
        if (e.target.value === OTHER) {
          startAdd();
        } else {
          onChange(e.target.value || null);
        }
      }}
      className="w-full rounded-tile bg-white px-3 py-2.5 text-sm text-ink outline-none ring-1 ring-line focus:ring-2 focus:ring-brand"
    >
      <option value="">— เลือกศูนย์บริการ —</option>
      {centers.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
      <option value={OTHER}>+ อื่นๆ…</option>
    </select>
  );
}
