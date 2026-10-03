import { getTranslations, setRequestLocale } from 'next-intl/server';
import { LoginForm } from '@/components/auth-forms';
import { FormPage } from '@/components/page-shell';
import type { Locale } from '@/i18n/routing';

export default async function LoginPage({ params, searchParams }: PageProps<'/[locale]/login'>) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const { next } = await searchParams;
  const t = await getTranslations('login');

  return (
    <FormPage title={t('title')}>
      <LoginForm next={typeof next === 'string' ? next : undefined} />
    </FormPage>
  );
}
