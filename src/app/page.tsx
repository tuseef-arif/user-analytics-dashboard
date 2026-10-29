import Link from 'next/link';

export default function Home() {
  return (
    <main>
      <h1>Dashboard App</h1>
      <Link href="/register">Create an account</Link>
    </main>
  );
}
