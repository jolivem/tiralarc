import { setRequestLocale } from 'next-intl/server';
import { ProfileChoice } from '@/components/profile-choice';
import { redirect } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { getCurrentUser } from '@/lib/current-user';
import { hasBothProfiles, homePathFor } from '@/lib/current-user-paths';

/** After signing in, archers who also coach choose the profile they work with. */
export default async function ChooseProfilePage({
  params,
  searchParams,
}: PageProps<'/[locale]/choose-profile'>) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const { next } = await searchParams;

  const user = await getCurrentUser();
  if (!user) return redirect({ href: '/login', locale: locale as Locale });
  if (!hasBothProfiles(user.roles)) {
    return redirect({ href: homePathFor(user.roles), locale: locale as Locale });
  }

  return <ProfileChoice next={typeof next === 'string' ? next : undefined} />;
}
