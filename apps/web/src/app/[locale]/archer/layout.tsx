import { redirect } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { getCurrentUser } from '@/lib/current-user';

/** Archer area: signed-in users holding the ARCHER role only. */
export default async function ArcherLayout({ children, params }: LayoutProps<'/[locale]/archer'>) {
  const { locale } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return redirect({
      href: { pathname: '/login', query: { next: '/archer' } },
      locale: locale as Locale,
    });
  }
  if (!user.roles.includes('ARCHER')) {
    return redirect({ href: '/account', locale: locale as Locale });
  }
  return children;
}
