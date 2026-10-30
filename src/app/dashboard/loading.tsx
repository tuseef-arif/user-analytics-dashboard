import { DashboardSkeleton } from '@/components/DashboardSkeleton';
import { GlassCard } from '@/components/GlassCard';
import { Skeleton } from '@/components/Skeleton';

export default function DashboardLoading() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-12">
      <p role="status" className="sr-only">
        Loading...
      </p>
      <div className="flex flex-col gap-4">
        <GlassCard className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Skeleton className="h-8 w-40" />
            <Skeleton className="mt-1 h-5 w-56" />
          </div>
          <Skeleton className="h-11 w-28" />
        </GlassCard>
        <DashboardSkeleton />
      </div>
    </main>
  );
}
