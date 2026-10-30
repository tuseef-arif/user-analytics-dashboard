const SIZES = { sm: 'size-4', md: 'size-5', lg: 'size-6' } as const;

export function Spinner({
  size = 'md',
  className = '',
}: {
  size?: keyof typeof SIZES;
  className?: string;
}) {
  // Without motion the ring stays as a static partial circle, so loading is still visible.
  return (
    <span
      aria-hidden="true"
      className={`inline-block shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none ${SIZES[size]} ${className}`}
    />
  );
}
