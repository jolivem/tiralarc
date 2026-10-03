import { Text, ThemeIcon } from '@mantine/core';
import { IconMailCheck } from '@tabler/icons-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ResendVerificationForm } from '@/components/auth-forms';
import { AnchorLink } from '@/components/links';
import { FormPage } from '@/components/page-shell';
import type { Locale } from '@/i18n/routing';

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
    <FormPage title={t('title')}>
      <ThemeIcon size={56} radius="xl" variant="light" mx="auto">
        <IconMailCheck size={30} />
      </ThemeIcon>
      <Text ta="center">{t('body', { email: address })}</Text>
      <Text size="sm" c="dimmed" ta="center">
        {t('notReceived')}
      </Text>
      <ResendVerificationForm email={address} />
      <AnchorLink href="/login" size="sm" ta="center">
        {t('backToLogin')}
      </AnchorLink>
    </FormPage>
  );
}
