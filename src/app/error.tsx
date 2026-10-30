'use client';

import { Button } from '@/components/Button';
import { GlassCard } from '@/components/GlassCard';

// retry (stable since Next 16.3) re-fetches the segment; reset only re-renders it.
export default function Error({ retry }: { retry: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <GlassCard className="w-full max-w-md text-center">
        <h1 className="heading mb-2">Something went wrong</h1>
        <p className="caption mb-6">
          This page could not be loaded. Please try again.
        </p>
        <Button type="button" onClick={() => retry()}>
          Try again
        </Button>
      </GlassCard>
    </main>
  );
}
