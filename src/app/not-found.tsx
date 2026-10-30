import { ButtonLink } from '@/components/ButtonLink';
import { GlassCard } from '@/components/GlassCard';

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <GlassCard className="w-full max-w-md text-center">
        <h1 className="heading mb-2">Page not found</h1>
        <p className="caption mb-6">
          The page you are looking for does not exist.
        </p>
        {/* Logged-out visitors are sent on to /login by the route guard. */}
        <ButtonLink href="/dashboard">Go to dashboard</ButtonLink>
      </GlassCard>
    </main>
  );
}
