// Mirrors the backend Gender enum (api/models.py); the single frontend source of truth.
export const GENDERS = ['male', 'female', 'other'] as const;
export type Gender = (typeof GENDERS)[number];

export interface User {
  id: number;
  username: string;
  gender: Gender;
  created_at: string;
}

export interface Stats {
  total: number;
  by_gender: Record<Gender, number>;
}

export interface RegisterInput {
  username: string;
  password: string;
  gender: Gender;
}

export interface LoginInput {
  username: string;
  password: string;
}
