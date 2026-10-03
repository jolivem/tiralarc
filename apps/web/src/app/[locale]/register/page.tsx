import { getTranslations, setRequestLocale } from 'next-intl/server';
import { RegisterForm } from '@/components/auth-forms';
import { FormPage } from '@/components/page-shell';
import type { Locale } from '@/i18n/routing';

export default async function RegisterPage({ params }: PageProps<'/[locale]/register'>) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations('register');

  return (
    <FormPage title={t('title')}>
      <RegisterForm />
    </FormPage>
  );
}
