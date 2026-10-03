import type { Locale } from '@/i18n/routing';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { VerifyEmailForm } from '@/components/auth-forms';
import { Notice, PageShell } from '@/components/ui';

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
    <PageShell title={t('title')}>
      {typeof token === 'string' && token ? (
        <>
          <p>{t('body')}</p>
          <VerifyEmailForm token={token} />
        </>
      ) : (
        <Notice tone="error">{t('missingToken')}</Notice>
      )}
    </PageShell>
  );
}
