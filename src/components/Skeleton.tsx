export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`rounded-control animate-pulse bg-white/10 motion-reduce:animate-none ${className}`}
    />
  );
}
