export type ButtonVariant =
  'primary' | 'secondary' | 'ghost' | 'danger' | 'icon';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

interface ButtonStyleOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

// Every variant keeps a border (transparent for primary) so the button outline stays
// visible in forced-colors mode, where backgrounds are removed. Fixed heights keep
// the size identical between idle, loading and disabled states. Hover only darkens the
// background (per variant below); nothing moves.
const BASE = [
  'inline-flex items-center justify-center gap-2 rounded-control border font-semibold',
  'transition-colors motion-reduce:transition-none',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
  'not-disabled:active:brightness-90',
  'disabled:cursor-not-allowed disabled:opacity-60',
  // Loading conveys information, so it keeps full contrast while disabled.
  'aria-busy:cursor-progress aria-busy:disabled:cursor-progress aria-busy:disabled:opacity-100',
].join(' ');

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'border-transparent bg-fg text-ink shadow-glass not-disabled:hover:bg-fg/75',
  secondary:
    'border-accent/40 bg-accent/15 text-fg not-disabled:hover:bg-accent/5',
  ghost:
    'border-control-border bg-glass text-fg not-disabled:hover:bg-black/40',
  danger:
    'border-danger-tint/50 bg-danger-tint/15 text-fg not-disabled:hover:bg-danger-tint/5',
  // Borderless control inside another field, e.g. the password visibility toggle.
  icon: 'border-transparent text-fg-muted not-disabled:hover:text-fg not-disabled:hover:bg-white/10',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-base',
  lg: 'h-12 px-6 text-base',
  icon: 'size-10',
};

export function buttonClasses({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
}: ButtonStyleOptions = {}): string {
  return [BASE, VARIANTS[variant], SIZES[size], fullWidth && 'w-full']
    .filter(Boolean)
    .join(' ');
}
