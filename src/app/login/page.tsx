import type { Metadata } from 'next';

import { LoginForm } from '@/components/LoginForm';

import styles from '../register/page.module.css';

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
    <main className={styles.main}>
      <h1 className={styles.title}>Sign in</h1>
      <LoginForm registered={registered} />
    </main>
  );
}
