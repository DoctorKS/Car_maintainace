import { useState } from 'react';
import { useServiceCenters } from '@/hooks/useCustomParts';
import { insertServiceCenter } from '@/lib/sync/repository';

interface Props {
  userId: string;
  value: string | null; // service_center_id
  onChange: (id: string | null) => void;
}

const OTHER = '__other__';

export default function ServiceCenterDropdown({ userId, value, onChange }: Props) {
  const centers = useServiceCenters(userId);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');

  const commitAdd = async () => {
    const name = draft.trim();
    if (!name) {
      setAdding(false);
      return;
    }
    const row = await insertServiceCenter(userId, name);
    onChange(row.id);
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
        placeholder="ชื่อศูนย์บริการ..."
        className="w-full rounded-tile bg-white px-3 py-2.5 text-sm text-ink outline-none ring-2 ring-brand"
      />
    );
  }

  return (
    <select
      value={value ?? ''}
      onChange={(e) => {
        if (e.target.value === OTHER) {
          setAdding(true);
          setDraft('');
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
