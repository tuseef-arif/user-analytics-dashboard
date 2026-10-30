import type { Metadata } from 'next';

import { AuthCard } from '@/components/AuthCard';
import { RegisterForm } from '@/components/RegisterForm';

export const metadata: Metadata = {
  title: 'Register | Dashboard App',
};

export default function RegisterPage() {
  return (
    <AuthCard title="Sign up">
      <RegisterForm />
    </AuthCard>
  );
}
