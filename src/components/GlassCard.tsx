import type { ElementType, HTMLAttributes, ReactNode } from 'react';

interface GlassCardProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  className?: string;
  children: ReactNode;
}

// Other attributes pass through so cards can keep their roles and aria labels.
export function GlassCard({
  as: Component = 'div',
  className = '',
  children,
  ...props
}: GlassCardProps) {
  return (
    <Component {...props} className={`glass p-6 ${className}`}>
      {children}
    </Component>
  );
}
