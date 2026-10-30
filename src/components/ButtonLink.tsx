import Link from 'next/link';
import type { ComponentProps } from 'react';

import {
  buttonClasses,
  type ButtonSize,
  type ButtonVariant,
} from '@/components/button-styles';

interface ButtonLinkProps extends ComponentProps<typeof Link> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

export function ButtonLink({
  variant,
  size,
  fullWidth,
  className = '',
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      {...props}
      className={`${buttonClasses({ variant, size, fullWidth })} ${className}`}
    />
  );
}
