import type { ReactNode } from 'react';

import { GlassCard } from '@/components/GlassCard';
import { Skeleton } from '@/components/Skeleton';

// Mirrors the two dashboard cards (sizes included) so nothing jumps when data arrives.
export function DashboardSkeleton({ title }: { title?: ReactNode }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <GlassCard>
        {title ?? <Skeleton className="mb-3 h-5 w-40" />}
        <Skeleton className="mx-auto size-40 rounded-full" />
      </GlassCard>
      <GlassCard>
        <Skeleton className="mb-3 h-5 w-32" />
        <div className="flex flex-col gap-4">
          {[0, 1, 2].map((row) => (
            <div key={row} className="flex flex-col gap-2">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
