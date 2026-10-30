'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState, type FormEvent } from 'react';

import { Button } from '@/components/Button';
import { FormField, invalidProps } from '@/components/FormField';
import { ApiError, register } from '@/lib/api';
import { GENDERS, type Gender } from '@/lib/types';
import {
  validateRegister,
  type RegisterErrors,
  type RegisterField,
} from '@/lib/validation';

const FIELDS: readonly RegisterField[] = ['username', 'password', 'gender'];
const GENERIC_ERROR = 'Something went wrong. Please try again.';

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function serverErrors(error: unknown): {
  fields: RegisterErrors;
  form: string | null;
} {
  if (!(error instanceof ApiError)) return { fields: {}, form: GENERIC_ERROR };

  const fields: RegisterErrors = {};
  for (const field of FIELDS) {
    const message = error.fieldErrors?.[field];
    if (message) fields[field] = message;
  }
  if (Object.keys(fields).length > 0) return { fields, form: null };
  if (error.status === 409)
    return { fields: { username: error.message }, form: null };
  return { fields: {}, form: error.message };
}

export function RegisterForm() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [gender, setGender] = useState('');
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  // State updates land after the next render, so a fast second submit could still
  // read pending as false; the ref blocks it synchronously.
  const inFlight = useRef(false);
  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const genderRef = useRef<HTMLSelectElement>(null);

  // Only the edited field's message goes; the others stay until their own field
  // changes or the form is submitted again.
  function clearError(field: RegisterField) {
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
    const clientErrors = validateRegister({ username, password, gender });
    setErrors(clientErrors);
    const firstInvalid = FIELDS.find((field) => clientErrors[field]);
    if (firstInvalid) {
      const refs = {
        username: usernameRef,
        password: passwordRef,
        gender: genderRef,
      };
      refs[firstInvalid].current?.focus();
      return;
    }

    inFlight.current = true;
    setPending(true);
    try {
      await register({
        username: username.trim(),
        password,
        // validateRegister has already checked gender is one of GENDERS.
        gender: gender as Gender,
      });
      // Stay pending while navigating so the account can't be submitted twice.
      router.push('/login?registered=1');
    } catch (error) {
      const { fields, form } = serverErrors(error);
      setErrors(fields);
      setFormError(form);
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
          autoComplete="new-password"
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

      <FormField id="gender" label="Gender" error={errors.gender}>
        <select
          ref={genderRef}
          id="gender"
          name="gender"
          required
          value={gender}
          onChange={(event) => {
            setGender(event.target.value);
            clearError('gender');
          }}
          className="glass-input glass-select"
          {...invalidProps('gender', errors.gender)}
        >
          <option value="" disabled>
            Select gender
          </option>
          {GENDERS.map((value) => (
            <option key={value} value={value}>
              {capitalize(value)}
            </option>
          ))}
        </select>
      </FormField>

      {formError && (
        <p role="alert" className="banner-error">
          {formError}
        </p>
      )}

      <Button type="submit" disabled={pending} loading={pending} fullWidth>
        {pending ? 'Creating account...' : 'Create account'}
      </Button>

      <p className="caption text-center">
        Already have an account?{' '}
        <Link href="/login" className="link">
          Sign in
        </Link>
      </p>
    </form>
  );
}
