import { GENDERS, type LoginInput } from '@/lib/types';

export type RegisterField = 'username' | 'password' | 'gender';
export type RegisterErrors = Partial<Record<RegisterField, string>>;
export type LoginField = 'username' | 'password';
export type LoginErrors = Partial<Record<LoginField, string>>;

const USERNAME_REQUIRED = 'Username is required.';
const PASSWORD_REQUIRED = 'Password is required.';

export interface RegisterValues {
  username: string;
  password: string;
  gender: string;
}

// Count code points like the backend (Python len), not UTF-16 units, so an emoji
// isn't counted twice and valid passwords aren't rejected client-side.
function length(value: string): number {
  return [...value].length;
}

export function validateRegister(input: RegisterValues): RegisterErrors {
  const errors: RegisterErrors = {};

  const username = input.username.trim();
  if (!username) {
    errors.username = USERNAME_REQUIRED;
  } else if (length(username) < 3 || length(username) > 64) {
    errors.username = 'Username must be 3-64 characters.';
  }

  // Not trimmed: spaces are legal password characters.
  const { password } = input;
  if (!password) {
    errors.password = PASSWORD_REQUIRED;
  } else if (length(password) < 8) {
    errors.password = 'Password must be at least 8 characters.';
  } else if (length(password) > 128) {
    errors.password = 'Password must be at most 128 characters.';
  }

  if (!(GENDERS as readonly string[]).includes(input.gender)) {
    errors.gender = 'Please select a gender.';
  }

  return errors;
}

// Presence only: the backend sets no length rules on login, and the form must not
// reveal the registration password policy.
export function validateLogin(input: LoginInput): LoginErrors {
  const errors: LoginErrors = {};
  if (!input.username.trim()) errors.username = USERNAME_REQUIRED;
  // Not trimmed: spaces are legal password characters.
  if (!input.password) errors.password = PASSWORD_REQUIRED;
  return errors;
}
