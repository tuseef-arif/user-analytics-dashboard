import type { Metadata } from 'next';

import { DashboardView } from '@/components/DashboardView';

import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Dashboard | Dashboard App',
};

export default function DashboardPage() {
  return (
    <main className={styles.main}>
      <DashboardView />
    </main>
  );
}
