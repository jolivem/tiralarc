import { Alert, Text } from '@mantine/core';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { FormPage } from '@/components/page-shell';
import { AcceptInvitationForm } from '@/components/profile/accept-invitation-form';
import type { Locale } from '@/i18n/routing';

/**
 * Landing page of the link emailed to a guest. As for email verification, the
 * token is only used when the guest clicks the button (a POST), not when a
 * mail scanner prefetches the link.
 */
export default async function AcceptInvitationPage({
  params,
  searchParams,
}: PageProps<'/[locale]/invitations/accept'>) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const { token } = await searchParams;
  const t = await getTranslations('profile.accept');

  return (
    <FormPage title={t('title')}>
      {typeof token === 'string' && token ? (
        <>
          <Text ta="center">{t('body')}</Text>
          <AcceptInvitationForm token={token} />
        </>
      ) : (
        <Alert color="red" variant="light">
          {t('missingToken')}
        </Alert>
      )}
    </FormPage>
  );
}
