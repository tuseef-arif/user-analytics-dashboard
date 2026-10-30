import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { WaveMesh } from '@/components/WaveMesh';

import './globals.css';

export const metadata: Metadata = {
  title: 'Dashboard App',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <WaveMesh />
        {children}
      </body>
    </html>
  );
}
