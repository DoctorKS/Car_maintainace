import { useEffect } from 'react';

interface Props {
  /** Object URL, signed URL, or any string the browser can fetch. */
  src: string;
  /** Optional alt text — defaults to "รูปขยาย". */
  alt?: string;
  onClose: () => void;
}

/**
 * Fullscreen image viewer with native pinch-zoom.
 *
 * The app's viewport meta is `user-scalable=no` so the rest of the PWA
 * doesn't accidentally zoom (especially after iOS double-taps on form
 * inputs). That global rule also blocks pinch-zoom inside any modal —
 * so for the duration of the lightbox we temporarily rewrite the meta
 * to `user-scalable=yes, maximum-scale=4`, and put it back on unmount.
 *
 * Escape closes; tapping the dark backdrop closes; the image itself
 * stops propagation so a pinch on the image doesn't dismiss the modal.
 */
export default function ImageLightbox({ src, alt = 'รูปขยาย', onClose }: Props) {
  useEffect(() => {
    const meta = document.querySelector('meta[name="viewport"]') as HTMLMetaElement | null;
    const original = meta?.getAttribute('content') ?? null;
    if (meta) {
      meta.setAttribute(
        'content',
        'width=device-width, initial-scale=1, maximum-scale=4, user-scalable=yes, viewport-fit=cover',
      );
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);

    return () => {
      window.removeEventListener('keydown', onKey);
      if (meta && original) meta.setAttribute('content', original);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/90 p-2"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="ภาพขยาย"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 z-10 rounded-full bg-white/95 px-3 py-1 text-sm font-semibold text-ink shadow-soft"
        style={{ top: 'calc(env(safe-area-inset-top) + 1rem)' }}
      >
        ปิด ✕
      </button>

      <div
        className="pointer-events-auto max-h-full max-w-full overflow-auto"
        style={{ touchAction: 'pinch-zoom' }}
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          className="block max-h-[95vh] max-w-[95vw] select-none object-contain"
          style={{ touchAction: 'pinch-zoom' }}
        />
      </div>

      <div
        className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/80 px-3 py-1 text-[10px] font-medium text-sub"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}
      >
        บีบนิ้วเพื่อขยาย · แตะพื้นที่ดำเพื่อปิด
      </div>
    </div>
  );
}
