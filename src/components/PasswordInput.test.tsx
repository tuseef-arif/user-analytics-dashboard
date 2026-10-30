// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PasswordInput } from '@/components/PasswordInput';

afterEach(() => {
  cleanup();
});

function setup() {
  const ue = userEvent.setup();
  const onSubmit = vi.fn((event: { preventDefault: () => void }) =>
    event.preventDefault(),
  );
  render(
    <form onSubmit={onSubmit}>
      <label htmlFor="password">Password</label>
      <PasswordInput
        id="password"
        autoComplete="current-password"
        aria-invalid
        defaultValue="Secret1!"
      />
    </form>,
  );
  return {
    ue,
    onSubmit,
    input: screen.getByLabelText('Password') as HTMLInputElement,
    toggle: screen.getByRole('button', { name: 'Show password' }),
  };
}

describe('PasswordInput', () => {
  it('starts hidden and passes input props through', () => {
    const { input, toggle } = setup();
    expect(input).toHaveAttribute('type', 'password');
    expect(input).toHaveAttribute('autocomplete', 'current-password');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(toggle).toHaveAttribute('aria-controls', 'password');
    expect(toggle).toHaveAttribute('type', 'button');
  });

  it('shows and hides the password, keeping the value', async () => {
    const { ue, input, toggle } = setup();

    await ue.click(toggle);
    expect(input).toHaveAttribute('type', 'text');
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(input).toHaveValue('Secret1!');

    await ue.click(toggle);
    expect(input).toHaveAttribute('type', 'password');
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
  });

  it('never submits the form', async () => {
    const { ue, onSubmit, toggle, input } = setup();

    await ue.click(toggle);
    expect(onSubmit).not.toHaveBeenCalled();

    // Enter in the field still submits through the form, not the toggle.
    fireEvent.submit(input.closest('form')!);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
