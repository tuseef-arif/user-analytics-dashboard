import type { Metadata } from 'next';

import { DashboardView } from '@/components/DashboardView';

export const metadata: Metadata = {
  title: 'Dashboard | Dashboard App',
};

export default function DashboardPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-12">
      <DashboardView />
    </main>
  );
}
