import Link from 'next/link';
import { api } from '@/lib/api';

async function getApiStatus(): Promise<'up' | 'down'> {
  try {
    const { data } = await api.GET('/api/v1/health');
    return data?.status === 'ok' ? 'up' : 'down';
  } catch {
    return 'down';
  }
}

export default async function HomePage() {
  const status = await getApiStatus();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-3xl font-semibold">Tiralarc</h1>
      <p className="text-sm">
        API :{' '}
        <span className={status === 'up' ? 'text-green-600' : 'text-red-600'}>
          {status === 'up' ? 'opérationnelle' : 'indisponible'}
        </span>
      </p>
      <nav className="flex gap-4 text-sm underline">
        <Link href="/login">Connexion</Link>
        <Link href="/register">Créer un compte</Link>
        <Link href="/profile">Mon profil</Link>
      </nav>
    </main>
  );
}
