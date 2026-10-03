import type { Locale } from '@/i18n/routing';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/api';

async function getApiStatus(): Promise<'up' | 'down'> {
  try {
    const { data } = await api.GET('/api/v1/health');
    return data?.status === 'ok' ? 'up' : 'down';
  } catch {
    return 'down';
  }
}

export default async function HomePage({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations('home');
  const status = await getApiStatus();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-3xl font-semibold">Tiralarc</h1>
      <p>{t('tagline')}</p>
      <p className="text-sm">
        {t('apiStatus')}{' '}
        <span className={status === 'up' ? 'text-green-600' : 'text-red-600'}>
          {status === 'up' ? t('apiUp') : t('apiDown')}
        </span>
      </p>
      <nav className="flex gap-4 text-sm underline">
        <Link href="/login">{t('login')}</Link>
        <Link href="/register">{t('register')}</Link>
        <Link href="/profile">{t('profile')}</Link>
      </nav>
    </main>
  );
}
