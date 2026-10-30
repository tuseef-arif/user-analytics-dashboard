import type { ReactNode } from 'react';

import { GlassCard } from '@/components/GlassCard';

// Shared by /login and /register. Each page mounts a fresh card, so the entrance
// animation plays every time the user switches between them.
export function AuthCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <GlassCard className="motion-safe:animate-card-in w-full max-w-md">
        <h1 className="heading text-center">{title}</h1>
        <p className="caption mt-2 mb-6 text-center">
          Welcome to User Analytics
        </p>
        {children}
      </GlassCard>
    </main>
  );
}
