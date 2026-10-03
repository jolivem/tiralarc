import type { Locale } from '@/i18n/routing';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { RegisterForm } from '@/components/auth-forms';
import { PageShell } from '@/components/ui';

export default async function RegisterPage({ params }: PageProps<'/[locale]/register'>) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations('register');

  return (
    <PageShell title={t('title')}>
      <RegisterForm />
    </PageShell>
  );
}
