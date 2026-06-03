import { useReceiptUrl } from '@/hooks/useReceiptUrl';
import Spinner from './Spinner';

interface Props {
  storagePath: string;
  onClose: () => void;
}

export default function ReceiptModal({ storagePath, onClose }: Props) {
  const url = useReceiptUrl(storagePath);
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-ink/85 p-4"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 rounded-full bg-white/95 px-3 py-1 text-sm font-semibold text-ink shadow-soft"
        style={{ top: `calc(env(safe-area-inset-top) + 1rem)` }}
      >
        ปิด ✕
      </button>
      {url ? (
        <img
          src={url}
          alt="ใบเสร็จ"
          className="max-h-[85vh] max-w-full rounded-card shadow-card"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <Spinner className="text-white" />
      )}
    </div>
  );
}
