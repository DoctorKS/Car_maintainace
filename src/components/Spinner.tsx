interface SpinnerProps {
  className?: string;
}

export default function Spinner({ className }: SpinnerProps) {
  return (
    <div
      className={`h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white ${className ?? ''}`}
      role="status"
      aria-label="loading"
    />
  );
}
