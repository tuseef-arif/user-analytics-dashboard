import type { ComponentPropsWithRef } from 'react';

import {
  buttonClasses,
  type ButtonSize,
  type ButtonVariant,
} from '@/components/button-styles';
import { Spinner } from '@/components/Spinner';

interface ButtonProps extends ComponentPropsWithRef<'button'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
}

// loading only changes the look; callers still control disabled, so behavior stays theirs.
export function Button({
  variant,
  size = 'md',
  loading = false,
  fullWidth,
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      aria-busy={loading || undefined}
      className={`${buttonClasses({ variant, size, fullWidth })} ${className}`}
    >
      {loading && <Spinner size={size} />}
      {children}
    </button>
  );
}
