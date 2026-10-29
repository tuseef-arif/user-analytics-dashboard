import type { Metadata } from 'next';

import { RegisterForm } from '@/components/RegisterForm';

import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Register | Dashboard App',
};

export default function RegisterPage() {
  return (
    <main className={styles.main}>
      <h1 className={styles.title}>Create your account</h1>
      <RegisterForm />
    </main>
  );
}
