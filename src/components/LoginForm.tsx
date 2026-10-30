'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState, type FormEvent } from 'react';

import { Button } from '@/components/Button';
import { FormField, invalidProps } from '@/components/FormField';
import { ApiError, login } from '@/lib/api';
import {
  validateLogin,
  type LoginErrors,
  type LoginField,
} from '@/lib/validation';

const FIELDS: readonly LoginField[] = ['username', 'password'];
const GENERIC_ERROR = 'Something went wrong. Please try again.';

// Every ApiError message goes to the form level, so a 401 never hints which field
// was wrong; 422 field messages are shown on their fields as well.
function serverErrors(error: unknown): { fields: LoginErrors; form: string } {
  if (!(error instanceof ApiError)) return { fields: {}, form: GENERIC_ERROR };

  const fields: LoginErrors = {};
  for (const field of FIELDS) {
    const message = error.fieldErrors?.[field];
    if (message) fields[field] = message;
  }
  return { fields, form: error.message };
}

export function LoginForm({ registered = false }: { registered?: boolean }) {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<LoginErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [showNotice, setShowNotice] = useState(registered);
  const [pending, setPending] = useState(false);
  // State updates land after the next render, so a fast second submit could still
  // read pending as false; the ref blocks it synchronously.
  const inFlight = useRef(false);
  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // Only the edited field's message goes; the others stay until their own field
  // changes or the form is submitted again.
  function clearError(field: LoginField) {
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;

    setFormError(null);
    const clientErrors = validateLogin({ username, password });
    setErrors(clientErrors);
    const firstInvalid = FIELDS.find((field) => clientErrors[field]);
    if (firstInvalid) {
      setShowNotice(false);
      const refs = { username: usernameRef, password: passwordRef };
      refs[firstInvalid].current?.focus();
      return;
    }

    inFlight.current = true;
    setPending(true);
    try {
      await login({ username: username.trim(), password });
      // replace, so Back doesn't return to the login form. Stay pending while
      // navigating so the form can't be submitted twice.
      router.replace('/dashboard');
      router.refresh();
    } catch (error) {
      const { fields, form } = serverErrors(error);
      setErrors(fields);
      setFormError(form);
      setShowNotice(false);
      if (error instanceof ApiError && error.status === 401) setPassword('');
      inFlight.current = false;
      setPending(false);
    }
  }

  return (
    <form
      noValidate
      method="post"
      onSubmit={handleSubmit}
      className="flex flex-col gap-4"
    >
      {showNotice && (
        <p role="status" className="banner-success">
          Account created. Please sign in.
        </p>
      )}

      <FormField id="username" label="Username" error={errors.username}>
        <input
          ref={usernameRef}
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          required
          value={username}
          onChange={(event) => {
            setUsername(event.target.value);
            clearError('username');
          }}
          className="glass-input"
          {...invalidProps('username', errors.username)}
        />
      </FormField>

      <FormField id="password" label="Password" error={errors.password}>
        <input
          ref={passwordRef}
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            clearError('password');
          }}
          className="glass-input"
          {...invalidProps('password', errors.password)}
        />
      </FormField>

      {formError && (
        <p role="alert" className="banner-error">
          {formError}
        </p>
      )}

      <Button type="submit" disabled={pending} loading={pending} fullWidth>
        {pending ? 'Signing in...' : 'Sign in'}
      </Button>

      <p className="caption text-center">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="link">
          Create one
        </Link>
      </p>
    </form>
  );
}
