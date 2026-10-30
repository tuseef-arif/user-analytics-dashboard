// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RegisterForm } from '@/components/RegisterForm';
import { ApiError, register } from '@/lib/api';
import type { User } from '@/lib/types';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/lib/api', async (importOriginal) => ({
  // Keep the real ApiError so the component's instanceof check still works.
  ...(await importOriginal<typeof import('@/lib/api')>()),
  register: vi.fn(),
}));
const registerMock = vi.mocked(register);

const user: User = {
  id: 1,
  username: 'testuser@email.com',
  gender: 'male',
  created_at: '2026-10-30T12:00:00Z',
};

function setup() {
  const ue = userEvent.setup();
  render(<RegisterForm />);
  return {
    ue,
    username: screen.getByLabelText('Username') as HTMLInputElement,
    password: screen.getByLabelText('Password') as HTMLInputElement,
    gender: screen.getByLabelText('Gender') as HTMLSelectElement,
    submit: screen.getByRole('button', { name: 'Create account' }),
  };
}

async function fillValid(
  ue: UserEvent,
  fields: ReturnType<typeof setup>,
  username = 'testuser@email.com',
) {
  await ue.type(fields.username, username);
  await ue.type(fields.password, 'Password123@');
  await ue.selectOptions(fields.gender, 'male');
}

function fieldError(control: HTMLElement): HTMLElement {
  const id = control.getAttribute('aria-describedby');
  expect(id).toBeTruthy();
  return document.getElementById(id!)!;
}

beforeEach(() => {
  registerMock.mockReset();
  push.mockReset();
});

afterEach(() => {
  cleanup();
});

describe('rendering', () => {
  it('renders the three labelled controls and a submit button', () => {
    const { username, password, gender, submit } = setup();
    expect(username).toHaveAttribute('type', 'text');
    expect(username).toHaveAttribute('autocomplete', 'username');
    expect(password).toHaveAttribute('type', 'password');
    expect(password).toHaveAttribute('autocomplete', 'new-password');
    expect(gender.tagName).toBe('SELECT');
    expect(submit).toHaveAttribute('type', 'submit');
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      '/login',
    );
  });

  it('offers exactly the placeholder plus male, female and other', () => {
    const { gender } = setup();
    const options = within(gender)
      .getAllByRole('option')
      .map((option) => [
        (option as HTMLOptionElement).value,
        option.textContent,
        (option as HTMLOptionElement).disabled,
      ]);
    expect(options).toEqual([
      ['', 'Select gender', true],
      ['male', 'Male', false],
      ['female', 'Female', false],
      ['other', 'Other', false],
    ]);
  });

  it('submits via POST so credentials never land in the URL before hydration', () => {
    setup();
    const form = screen.getByRole('button').closest('form')!;
    expect(form).toHaveAttribute('method', 'post');
    expect(form).toHaveAttribute('novalidate');
  });
});

describe('client-side validation', () => {
  it('shows all field errors, focuses the first and does not call the API', async () => {
    const { ue, username, password, gender, submit } = setup();
    expect(username).not.toHaveAttribute('aria-invalid');

    await ue.click(submit);

    expect(fieldError(username)).toHaveTextContent('Username is required.');
    expect(fieldError(password)).toHaveTextContent('Password is required.');
    expect(fieldError(gender)).toHaveTextContent('Please select a gender.');
    for (const control of [username, password, gender]) {
      expect(control).toHaveAttribute('aria-invalid', 'true');
      expect(control).toHaveAttribute(
        'aria-describedby',
        `${control.id}-error`,
      );
      expect(fieldError(control)).toHaveAttribute('role', 'alert');
    }
    expect(username).toHaveFocus();
    expect(registerMock).not.toHaveBeenCalled();
  });

  it('focuses the first invalid field when earlier ones are valid', async () => {
    const fields = setup();
    await fields.ue.type(fields.username, 'testuser');
    await fields.ue.click(fields.submit);

    expect(fields.username).not.toHaveAttribute('aria-invalid');
    expect(fields.password).toHaveFocus();
  });

  it('clears a field error as soon as that field changes, leaving the others', async () => {
    const { ue, username, password, gender, submit } = setup();
    await ue.click(submit);

    await ue.type(username, 'a');
    expect(username).not.toHaveAttribute('aria-invalid');
    expect(username).not.toHaveAttribute('aria-describedby');
    expect(screen.queryByText('Username is required.')).not.toBeInTheDocument();
    expect(fieldError(password)).toHaveTextContent('Password is required.');

    await ue.selectOptions(gender, 'female');
    expect(gender).not.toHaveAttribute('aria-invalid');
    expect(
      screen.queryByText('Please select a gender.'),
    ).not.toBeInTheDocument();
    expect(password).toHaveAttribute('aria-invalid', 'true');
    expect(registerMock).not.toHaveBeenCalled();
  });
});

describe('submitting', () => {
  it('calls register with the trimmed username and redirects to login', async () => {
    registerMock.mockResolvedValue(user);
    const fields = setup();
    await fillValid(fields.ue, fields, '  testuser@email.com  ');

    await fields.ue.click(fields.submit);

    expect(registerMock).toHaveBeenCalledTimes(1);
    expect(registerMock).toHaveBeenCalledWith({
      username: 'testuser@email.com',
      password: 'Password123@',
      gender: 'male',
    });
    expect(push).toHaveBeenCalledWith('/login?registered=1');
  });

  it('disables the button while pending and ignores repeat submits', async () => {
    let resolve!: (value: User) => void;
    registerMock.mockReturnValue(new Promise<User>((r) => (resolve = r)));
    const fields = setup();
    await fillValid(fields.ue, fields);

    await fields.ue.click(fields.submit);

    const pendingButton = screen.getByRole('button', {
      name: 'Creating account...',
    });
    expect(pendingButton).toBeDisabled();
    await fields.ue.click(pendingButton);
    // Bypass the disabled button too, as a keyboard Enter in a field would.
    fireEvent.submit(pendingButton.closest('form')!);
    expect(registerMock).toHaveBeenCalledTimes(1);

    resolve(user);
    await vi.waitFor(() => expect(push).toHaveBeenCalledTimes(1));
  });
});

describe('server errors', () => {
  it('shows a 409 on the username field', async () => {
    registerMock.mockRejectedValue(new ApiError(409, 'Username already taken'));
    const fields = setup();
    await fillValid(fields.ue, fields);

    await fields.ue.click(fields.submit);

    expect(fields.username).toHaveAttribute('aria-invalid', 'true');
    expect(fieldError(fields.username)).toHaveTextContent(
      'Username already taken',
    );
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(push).not.toHaveBeenCalled();
  });

  it('clears a server field error once the field is edited', async () => {
    registerMock.mockRejectedValue(new ApiError(409, 'Username already taken'));
    const fields = setup();
    await fillValid(fields.ue, fields);
    await fields.ue.click(fields.submit);
    expect(fields.username).toHaveAttribute('aria-invalid', 'true');

    await fields.ue.type(fields.username, 'x');

    expect(fields.username).not.toHaveAttribute('aria-invalid');
    expect(
      screen.queryByText('Username already taken'),
    ).not.toBeInTheDocument();
  });

  it('maps 422 fieldErrors onto the matching fields', async () => {
    registerMock.mockRejectedValue(
      new ApiError(422, 'joined message', {
        username:
          'may only contain letters, digits and the characters . _ + @ -',
        password: 'String should have at most 128 characters',
        gender: "Input should be 'male', 'female' or 'other'",
      }),
    );
    const fields = setup();
    await fillValid(fields.ue, fields);

    await fields.ue.click(fields.submit);

    expect(fieldError(fields.username)).toHaveTextContent('may only contain');
    expect(fieldError(fields.password)).toHaveTextContent('at most 128');
    expect(fieldError(fields.gender)).toHaveTextContent(
      "Input should be 'male'",
    );
    expect(screen.queryByText('joined message')).not.toBeInTheDocument();
  });

  it.each([
    [
      new ApiError(0, 'Network error. Please try again.'),
      'Network error. Please try again.',
    ],
    [new Error('boom'), 'Something went wrong. Please try again.'],
  ])(
    'shows a form-level alert and keeps the values (%s)',
    async (error, message) => {
      registerMock.mockRejectedValue(error);
      const fields = setup();
      await fillValid(fields.ue, fields);

      await fields.ue.click(fields.submit);

      expect(screen.getByText(message)).toHaveAttribute('role', 'alert');
      expect(screen.queryByText('boom')).not.toBeInTheDocument();
      expect(fields.username).toHaveValue('testuser@email.com');
      expect(fields.password).toHaveValue('Password123@');
      expect(fields.gender).toHaveValue('male');
      expect(
        screen.getByRole('button', { name: 'Create account' }),
      ).toBeEnabled();
    },
  );

  it('clears previous server errors on the next submit', async () => {
    registerMock
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
    expect(push).toHaveBeenCalledWith('/login?registered=1');
  });
});
