// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LoginForm } from '@/components/LoginForm';
import { ApiError, login } from '@/lib/api';
import type { User } from '@/lib/types';

const replace = vi.fn();
const refresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, refresh }),
}));
vi.mock('@/lib/api', async (importOriginal) => ({
  // Keep the real ApiError so the component's instanceof check still works.
  ...(await importOriginal<typeof import('@/lib/api')>()),
  login: vi.fn(),
}));
const loginMock = vi.mocked(login);

const user: User = {
  id: 1,
  username: 'testuser@email.com',
  gender: 'male',
  created_at: '2026-10-30T12:00:00Z',
};

const NOTICE = 'Account created. Please sign in.';

function setup(props: { registered?: boolean } = {}) {
  const ue = userEvent.setup();
  render(<LoginForm {...props} />);
  return {
    ue,
    username: screen.getByLabelText('Username') as HTMLInputElement,
    password: screen.getByLabelText('Password') as HTMLInputElement,
    submit: screen.getByRole('button', { name: 'Sign In' }),
  };
}

async function fillValid(
  ue: UserEvent,
  fields: ReturnType<typeof setup>,
  username = 'testuser@email.com',
) {
  await ue.type(fields.username, username);
  await ue.type(fields.password, 'Password123@');
}

function fieldError(control: HTMLElement): HTMLElement {
  const id = control.getAttribute('aria-describedby');
  expect(id).toBeTruthy();
  return document.getElementById(id!)!;
}

beforeEach(() => {
  loginMock.mockReset();
  replace.mockReset();
  refresh.mockReset();
});

afterEach(() => {
  cleanup();
});

describe('rendering', () => {
  it('renders the labelled controls, a submit button and the register link', () => {
    const { username, password, submit } = setup();
    expect(username).toHaveAttribute('type', 'text');
    expect(username).toHaveAttribute('autocomplete', 'username');
    expect(password).toHaveAttribute('type', 'password');
    expect(password).toHaveAttribute('autocomplete', 'current-password');
    expect(submit).toHaveAttribute('type', 'submit');
    expect(screen.getByRole('link', { name: 'Create one' })).toHaveAttribute(
      'href',
      '/register',
    );
  });

  it('submits via POST so credentials never land in the URL before hydration', () => {
    setup();
    const form = screen
      .getByRole('button', { name: 'Sign In' })
      .closest('form')!;
    expect(form).toHaveAttribute('method', 'post');
    expect(form).toHaveAttribute('novalidate');
  });
});

describe('registered notice', () => {
  it('shows the notice when registered is true', () => {
    setup({ registered: true });
    expect(screen.getByRole('status')).toHaveTextContent(NOTICE);
  });

  it.each([{ registered: false }, {}])('hides it for %j', (props) => {
    setup(props);
    expect(screen.queryByText(NOTICE)).not.toBeInTheDocument();
  });

  it('disappears after a failed submit', async () => {
    loginMock.mockRejectedValue(
      new ApiError(401, 'Invalid username or password'),
    );
    const fields = setup({ registered: true });
    await fillValid(fields.ue, fields);

    await fields.ue.click(fields.submit);

    expect(screen.queryByText(NOTICE)).not.toBeInTheDocument();
  });
});

describe('client-side validation', () => {
  it('shows both field errors, focuses the first and does not call the API', async () => {
    const { ue, username, password, submit } = setup();
    expect(username).not.toHaveAttribute('aria-invalid');

    await ue.click(submit);

    expect(fieldError(username)).toHaveTextContent('Username is required.');
    expect(fieldError(password)).toHaveTextContent('Password is required.');
    for (const control of [username, password]) {
      expect(control).toHaveAttribute('aria-invalid', 'true');
      expect(control).toHaveAttribute(
        'aria-describedby',
        `${control.id}-error`,
      );
      expect(fieldError(control)).toHaveAttribute('role', 'alert');
    }
    expect(username).toHaveFocus();
    expect(loginMock).not.toHaveBeenCalled();
  });

  it('focuses the password when only it is missing', async () => {
    const fields = setup();
    await fields.ue.type(fields.username, 'testuser');
    await fields.ue.click(fields.submit);

    expect(fields.username).not.toHaveAttribute('aria-invalid');
    expect(fields.password).toHaveFocus();
  });

  it('clears a field error as soon as that field changes, leaving the other', async () => {
    const { ue, username, password, submit } = setup();
    await ue.click(submit);

    await ue.type(password, 'p');
    expect(password).not.toHaveAttribute('aria-invalid');
    expect(password).not.toHaveAttribute('aria-describedby');
    expect(screen.queryByText('Password is required.')).not.toBeInTheDocument();
    expect(fieldError(username)).toHaveTextContent('Username is required.');

    await ue.type(username, 'u');
    expect(screen.queryByText('Username is required.')).not.toBeInTheDocument();
    expect(loginMock).not.toHaveBeenCalled();
  });
});

describe('submitting', () => {
  it('calls login with the trimmed username, then replaces and refreshes', async () => {
    loginMock.mockResolvedValue(user);
    const fields = setup();
    await fillValid(fields.ue, fields, '  testuser@email.com  ');

    await fields.ue.click(fields.submit);

    expect(loginMock).toHaveBeenCalledTimes(1);
    expect(loginMock).toHaveBeenCalledWith({
      username: 'testuser@email.com',
      password: 'Password123@',
    });
    expect(replace).toHaveBeenCalledWith('/dashboard');
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(replace.mock.invocationCallOrder[0]).toBeLessThan(
      refresh.mock.invocationCallOrder[0],
    );
  });

  it('disables the button while pending and ignores repeat submits', async () => {
    let resolve!: (value: User) => void;
    loginMock.mockReturnValue(new Promise<User>((r) => (resolve = r)));
    const fields = setup();
    await fillValid(fields.ue, fields);

    await fields.ue.click(fields.submit);

    const pendingButton = screen.getByRole('button', { name: 'Signing In...' });
    expect(pendingButton).toBeDisabled();
    await fields.ue.click(pendingButton);
    // Bypass the disabled button too, as a keyboard Enter in a field would.
    fireEvent.submit(pendingButton.closest('form')!);
    expect(loginMock).toHaveBeenCalledTimes(1);

    resolve(user);
    await vi.waitFor(() => expect(replace).toHaveBeenCalledTimes(1));
  });
});

describe('server errors', () => {
  it('shows a 401 at form level, keeps the username and clears the password', async () => {
    loginMock.mockRejectedValue(
      new ApiError(401, 'Invalid username or password'),
    );
    const fields = setup();
    await fillValid(fields.ue, fields);

    await fields.ue.click(fields.submit);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Invalid username or password',
    );
    expect(fields.username).not.toHaveAttribute('aria-invalid');
    expect(fields.password).not.toHaveAttribute('aria-invalid');
    expect(fields.username).toHaveValue('testuser@email.com');
    expect(fields.password).toHaveValue('');
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeEnabled();
  });

  it('shows the network message and keeps both values', async () => {
    loginMock.mockRejectedValue(
      new ApiError(0, 'Network error. Please try again.'),
    );
    const fields = setup();
    await fillValid(fields.ue, fields);

    await fields.ue.click(fields.submit);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Network error. Please try again.',
    );
    expect(fields.username).toHaveValue('testuser@email.com');
    expect(fields.password).toHaveValue('Password123@');
  });

  it('shows 422 fieldErrors on the matching fields', async () => {
    loginMock.mockRejectedValue(
      new ApiError(422, 'password: String should have at most 128 characters', {
        password: 'String should have at most 128 characters',
      }),
    );
    const fields = setup();
    await fillValid(fields.ue, fields);

    await fields.ue.click(fields.submit);

    expect(fields.password).toHaveAttribute('aria-invalid', 'true');
    expect(fieldError(fields.password)).toHaveTextContent('at most 128');
    expect(fields.username).not.toHaveAttribute('aria-invalid');
  });

  it('shows a generic message for a non-API error', async () => {
    loginMock.mockRejectedValue(new Error('boom'));
    const fields = setup();
    await fillValid(fields.ue, fields);

    await fields.ue.click(fields.submit);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Something went wrong. Please try again.',
    );
    expect(screen.queryByText('boom')).not.toBeInTheDocument();
  });

  it('clears previous errors on the next submit', async () => {
    loginMock
      .mockRejectedValueOnce(
        new ApiError(0, 'Network error. Please try again.'),
      )
      .mockResolvedValueOnce(user);
    const fields = setup();
    await fillValid(fields.ue, fields);

    await fields.ue.click(fields.submit);
    expect(screen.getByRole('alert')).toBeInTheDocument();

    await fields.ue.click(fields.submit);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith('/dashboard');
  });
});
