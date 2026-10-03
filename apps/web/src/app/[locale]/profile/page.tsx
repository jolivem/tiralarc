import type { SelfAssignableRole } from '@tiralarc/api-client';
import type { Locale } from '@/i18n/routing';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { logout } from '@/app/actions/auth';
import { RolesForm } from '@/components/auth-forms';
import { PageShell, SecondaryButton } from '@/components/ui';
import { redirect } from '@/i18n/navigation';
import { getAuthedApi } from '@/lib/api';

const PROVIDER_LABELS = { GOOGLE: 'Google', APPLE: 'Apple' } as const;

export default async function ProfilePage({ params }: PageProps<'/[locale]/profile'>) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations();
  const format = await getFormatter();

  const { data: user } = await (await getAuthedApi()).GET('/api/v1/users/me');
  // proxy.ts already redirects anonymous visitors; this covers a session revoked meanwhile.
  if (!user)
    return redirect({
      href: { pathname: '/login', query: { next: '/profile' } },
      locale: locale as Locale,
    });

  const methods = [
    ...(user.hasPassword ? [t('profile.methodPassword')] : []),
    ...user.providers.map((p) => PROVIDER_LABELS[p]),
  ];

  return (
    <PageShell title={t('profile.hello', { name: user.displayName ?? user.email })}>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-neutral-500">{t('profile.email')}</dt>
        <dd>{user.email}</dd>
        <dt className="text-neutral-500">{t('profile.roles')}</dt>
        <dd>{user.roles.map((role) => t(`roles.${role}`)).join(', ') || '—'}</dd>
        <dt className="text-neutral-500">{t('profile.signInMethods')}</dt>
        <dd>{methods.join(', ')}</dd>
        <dt className="text-neutral-500">{t('profile.memberSince')}</dt>
        <dd>{format.dateTime(new Date(user.createdAt), { dateStyle: 'long' })}</dd>
      </dl>

      <section className="flex w-full max-w-sm flex-col gap-3">
        <h2 className="font-medium">{t('profile.editRoles')}</h2>
        <RolesForm
          initialRoles={user.roles.filter((r): r is SelfAssignableRole => r !== 'ADMIN')}
          submitLabel={t('profile.save')}
        />
      </section>

      <form action={logout}>
        <SecondaryButton type="submit">{t('profile.logout')}</SecondaryButton>
      </form>
    </PageShell>
  );
}
