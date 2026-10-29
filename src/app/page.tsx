import { redirect } from 'next/navigation';

// The proxy already sends signed-in users to /dashboard; this covers anything it misses.
export default function Home() {
  redirect('/login');
}
