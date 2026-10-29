import { GENDERS } from '@/lib/types';

export type RegisterField = 'username' | 'password' | 'gender';
export type RegisterErrors = Partial<Record<RegisterField, string>>;

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
    errors.username = 'Username is required.';
  } else if (length(username) < 3 || length(username) > 64) {
    errors.username = 'Username must be 3-64 characters.';
  }

  // Not trimmed: spaces are legal password characters.
  const { password } = input;
  if (!password) {
    errors.password = 'Password is required.';
  } else if (length(password) < 8 || length(password) > 128) {
    errors.password = 'Password must be 8-128 characters.';
  }

  if (!(GENDERS as readonly string[]).includes(input.gender)) {
    errors.gender = 'Please select a gender.';
  }

  return errors;
}
