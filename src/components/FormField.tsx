import type { ReactNode } from 'react';

import styles from './FormField.module.css';

interface FormFieldProps {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}

function errorId(id: string): string {
  return `${id}-error`;
}

// Spread onto the control so assistive tech announces it as invalid and reads the error.
export function invalidProps(id: string, error?: string) {
  return error
    ? { 'aria-invalid': true as const, 'aria-describedby': errorId(id) }
    : {};
}

export function FormField({ id, label, error, children }: FormFieldProps) {
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      {children}
      {error && (
        <p id={errorId(id)} role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}
