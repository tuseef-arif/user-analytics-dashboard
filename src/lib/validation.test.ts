import { describe, expect, it } from 'vitest';

import { validateLogin, validateRegister } from '@/lib/validation';

const valid = {
  username: 'testuser',
  password: 'Password123@',
  gender: 'male',
};

describe('username', () => {
  it.each(['', '   '])('is required (%j)', (username) => {
    expect(validateRegister({ ...valid, username }).username).toBe(
      'Username is required.',
    );
  });

  it.each([
    [2, 'Username must be 3-64 characters.'],
    [3, undefined],
    [64, undefined],
    [65, 'Username must be 3-64 characters.'],
  ])('length %i -> %s', (n, expected) => {
    expect(
      validateRegister({ ...valid, username: 'a'.repeat(n) }).username,
    ).toBe(expected);
  });

  it('is trimmed before the length check', () => {
    expect(validateRegister({ ...valid, username: '  ab  ' }).username).toBe(
      'Username must be 3-64 characters.',
    );
    expect(validateRegister({ ...valid, username: '  abc  ' })).toEqual({});
  });
});

describe('password', () => {
  it('is required', () => {
    expect(validateRegister({ ...valid, password: '' }).password).toBe(
      'Password is required.',
    );
  });

  it.each([
    [7, 'Password must be at least 8 characters.'],
    [8, undefined],
    [128, undefined],
    [129, 'Password must be at most 128 characters.'],
  ])('length %i -> %s', (n, expected) => {
    expect(
      validateRegister({ ...valid, password: 'x'.repeat(n) }).password,
    ).toBe(expected);
  });

  it('is not trimmed: surrounding spaces count toward the length', () => {
    expect(validateRegister({ ...valid, password: ' 123456 ' })).toEqual({});
    expect(validateRegister({ ...valid, password: '        ' })).toEqual({});
  });

  it('counts an emoji as one character, like the backend', () => {
    expect(validateRegister({ ...valid, password: '😀'.repeat(128) })).toEqual(
      {},
    );
    expect(
      validateRegister({ ...valid, password: '😀'.repeat(7) }).password,
    ).toBe('Password must be at least 8 characters.');
  });
});

describe('gender', () => {
  it.each(['', 'unknown', 'Male'])('rejects %j', (gender) => {
    expect(validateRegister({ ...valid, gender }).gender).toBe(
      'Please select a gender.',
    );
  });

  it.each(['male', 'female', 'other'])('accepts %s', (gender) => {
    expect(validateRegister({ ...valid, gender })).toEqual({});
  });
});

it('accepts the sample account', () => {
  expect(
    validateRegister({
      username: 'testuser@email.com',
      password: 'Password123@',
      gender: 'male',
    }),
  ).toEqual({});
});

it('reports every invalid field at once', () => {
  expect(validateRegister({ username: '', password: '', gender: '' })).toEqual({
    username: 'Username is required.',
    password: 'Password is required.',
    gender: 'Please select a gender.',
  });
});

describe('validateLogin', () => {
  const login = { username: 'testuser', password: 'Password123@' };

  it.each(['', '   '])('requires a username (%j)', (username) => {
    expect(validateLogin({ ...login, username })).toEqual({
      username: 'Username is required.',
    });
  });

  it('requires a password', () => {
    expect(validateLogin({ ...login, password: '' })).toEqual({
      password: 'Password is required.',
    });
  });

  it('does not trim the password: only spaces is non-empty', () => {
    expect(validateLogin({ ...login, password: '   ' })).toEqual({});
  });

  it('has no length rules', () => {
    expect(validateLogin({ username: 'a', password: 'b' })).toEqual({});
  });

  it('accepts the sample account', () => {
    expect(
      validateLogin({
        username: 'testuser@email.com',
        password: 'Password123@',
      }),
    ).toEqual({});
  });

  it('returns {} for a valid input', () => {
    expect(validateLogin(login)).toEqual({});
  });

  it('reports both fields at once', () => {
    expect(validateLogin({ username: '', password: '' })).toEqual({
      username: 'Username is required.',
      password: 'Password is required.',
    });
  });
});
