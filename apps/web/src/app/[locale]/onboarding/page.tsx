import type { SelfAssignableRole } from '@tiralarc/api-client';
import type { Locale } from '@/i18n/routing';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { RolesForm } from '@/components/auth-forms';
import { PageShell } from '@/components/ui';
import { redirect } from '@/i18n/navigation';
import { getAuthedApi } from '@/lib/api';

/** Shown after a first Google / Apple sign-in from the login page: the user picks their roles. */
export default async function OnboardingPage({
  params,
  searchParams,
}: PageProps<'/[locale]/onboarding'>) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const { next } = await searchParams;
  const t = await getTranslations('onboarding');

  const { data: user } = await (await getAuthedApi()).GET('/api/v1/users/me');
  if (!user) return redirect({ href: '/login', locale: locale as Locale });

  return (
    <PageShell title={t('title')}>
      <p>{t('body')}</p>
      <RolesForm
        initialRoles={user.roles.filter((r): r is SelfAssignableRole => r !== 'ADMIN')}
        submitLabel={t('submit')}
        next={typeof next === 'string' ? next : ''}
      />
    </PageShell>
  );
}
