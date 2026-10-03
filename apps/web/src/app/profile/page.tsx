import { redirect } from 'next/navigation';
import { logout } from '@/app/actions/auth';
import { getAuthedApi } from '@/lib/api';

export default async function ProfilePage() {
  const api = await getAuthedApi();
  const { data: user } = await api.GET('/api/v1/users/me');
  // proxy.ts already redirects anonymous visitors; this covers a token revoked meanwhile.
  if (!user) redirect('/login?next=/profile');

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-2xl font-semibold">Bonjour {user.displayName ?? user.email}</h1>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-neutral-500">Email</dt>
        <dd>{user.email}</dd>
        <dt className="text-neutral-500">Inscrit le</dt>
        <dd>{new Date(user.createdAt).toLocaleDateString('fr-FR')}</dd>
      </dl>
      <form action={logout}>
        <button type="submit" className="rounded border px-4 py-2">
          Se déconnecter
        </button>
      </form>
    </main>
  );
}
