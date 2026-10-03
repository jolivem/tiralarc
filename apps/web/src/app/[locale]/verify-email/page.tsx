import { Alert, Text } from '@mantine/core';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { VerifyEmailForm } from '@/components/auth-forms';
import { FormPage } from '@/components/page-shell';
import type { Locale } from '@/i18n/routing';

/**
 * Landing page of the link emailed at sign-up. The token is only consumed when
 * the user clicks the button (a POST): mail scanners that prefetch links (GET)
 * would otherwise burn it.
 */
export default async function VerifyEmailPage({
  params,
  searchParams,
}: PageProps<'/[locale]/verify-email'>) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const { token } = await searchParams;
  const t = await getTranslations('verifyEmail');

  return (
    <FormPage title={t('title')}>
      {typeof token === 'string' && token ? (
        <>
          <Text ta="center">{t('body')}</Text>
          <VerifyEmailForm token={token} />
        </>
      ) : (
        <Alert color="red" variant="light">
          {t('missingToken')}
        </Alert>
      )}
    </FormPage>
  );
}
