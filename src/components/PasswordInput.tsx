'use client';

import { useState, type ComponentPropsWithRef } from 'react';

import { Button } from '@/components/Button';

type PasswordInputProps = Omit<ComponentPropsWithRef<'input'>, 'type'>;

function EyeIcon({ crossed }: { crossed: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-5"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
      {crossed && <path d="M3 3l18 18" />}
    </svg>
  );
}

// A password field with a show/hide toggle. Every input prop (id, ref, value,
// autoComplete, aria-*) passes through so labels and error wiring are unchanged.
export function PasswordInput({
  className = '',
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? 'text' : 'password'}
        className={`glass-input pr-14 ${className}`}
      />
      {/* type="button" so it never submits the form; aria-pressed announces the state. */}
      <Button
        type="button"
        variant="icon"
        size="icon"
        aria-label="Show password"
        aria-pressed={visible}
        aria-controls={props.id}
        onClick={() => setVisible((current) => !current)}
        className="absolute top-1/2 right-1 -translate-y-1/2"
      >
        <EyeIcon crossed={visible} />
      </Button>
    </div>
  );
}
