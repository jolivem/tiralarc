import { Text } from '@mantine/core';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ForgotPasswordForm } from '@/components/auth-forms';
import { FormPage } from '@/components/page-shell';
import type { Locale } from '@/i18n/routing';

/** "Forgot password" (linked from the sign-in form): a link to choose a new one is emailed. */
export default async function ForgotPasswordPage({
  params,
}: PageProps<'/[locale]/forgot-password'>) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations('forgotPassword');

  return (
    <FormPage title={t('title')}>
      <Text ta="center">{t('body')}</Text>
      <ForgotPasswordForm />
    </FormPage>
  );
}
