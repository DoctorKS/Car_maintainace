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
        className="rounded-full bg-brandSoft px-3 py-1 text-[11px] font-semibold text-brand hover:bg-brand/15"
      >
        แสดงรูปที่อัพโหลด
      </button>
      {open && <ReceiptModal storagePath={storagePath} onClose={() => setOpen(false)} />}
    </>
  );
}
