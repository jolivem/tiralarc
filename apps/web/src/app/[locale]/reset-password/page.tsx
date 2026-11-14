import { Alert, Text } from '@mantine/core';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ResetPasswordForm } from '@/components/auth-forms';
import { AnchorLink } from '@/components/links';
import { FormPage } from '@/components/page-shell';
import type { Locale } from '@/i18n/routing';

/**
 * Landing page of the "forgot password" link. Like the email confirmation, the token is only
 * used when the form is sent (a POST): mail scanners that open links don't burn it.
 */
export default async function ResetPasswordPage({
  params,
  searchParams,
}: PageProps<'/[locale]/reset-password'>) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const { token } = await searchParams;
  const t = await getTranslations('resetPassword');

  return (
    <FormPage title={t('title')}>
      {typeof token === 'string' && token ? (
        <>
          <Text ta="center">{t('body')}</Text>
          <ResetPasswordForm token={token} />
        </>
      ) : (
        <Alert color="red" variant="light">
          {t('missingToken')} <AnchorLink href="/forgot-password">{t('newLink')}</AnchorLink>
        </Alert>
      )}
    </FormPage>
  );
}
