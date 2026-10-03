import type { Locale } from '@/i18n/routing';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ResendVerificationForm } from '@/components/auth-forms';
import { PageShell } from '@/components/ui';
import { Link } from '@/i18n/navigation';

export default async function CheckEmailPage({
  params,
  searchParams,
}: PageProps<'/[locale]/register/check-email'>) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const { email } = await searchParams;
  const address = typeof email === 'string' ? email : '';
  const t = await getTranslations('checkEmail');

  return (
    <PageShell title={t('title')}>
      <p className="max-w-md text-center">{t('body', { email: address })}</p>
      <p className="text-sm text-neutral-500">{t('notReceived')}</p>
      <ResendVerificationForm email={address} />
      <Link href="/login" className="text-sm underline">
        {t('backToLogin')}
      </Link>
    </PageShell>
  );
}
