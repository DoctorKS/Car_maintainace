import { useState } from 'react';
import ReceiptModal from './ReceiptModal';

interface Props {
  storagePath: string | null | undefined;
}

export default function ReceiptImageButton({ storagePath }: Props) {
  const [open, setOpen] = useState(false);
  if (!storagePath) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-medium text-white backdrop-blur hover:bg-white/25"
      >
        แสดงรูปที่อัพโหลด
      </button>
      {open && <ReceiptModal storagePath={storagePath} onClose={() => setOpen(false)} />}
    </>
  );
}
