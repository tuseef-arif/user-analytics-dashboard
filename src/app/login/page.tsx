import type { Metadata } from 'next';

import { AuthCard } from '@/components/AuthCard';
import { LoginForm } from '@/components/LoginForm';

export const metadata: Metadata = {
  title: 'Sign in | Dashboard App',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const registered = params.registered === '1';

  return (
    <AuthCard title="Sign in">
      <LoginForm registered={registered} />
    </AuthCard>
  );
}
