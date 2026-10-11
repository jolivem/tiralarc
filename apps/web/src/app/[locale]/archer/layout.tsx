import { redirect } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { getActiveProfile, getCurrentUser } from '@/lib/current-user';

/** Archer area: signed-in users holding the ARCHER role, signed in with the archer profile. */
export default async function ArcherLayout({ children, params }: LayoutProps<'/[locale]/archer'>) {
  const { locale } = await params;
  const [user, profile] = await Promise.all([getCurrentUser(), getActiveProfile()]);
  if (!user) {
    return redirect({
      href: { pathname: '/login', query: { next: '/archer' } },
      locale: locale as Locale,
    });
  }
  if (profile !== 'ARCHER') {
    return redirect({ href: '/account', locale: locale as Locale });
  }
  return children;
}
