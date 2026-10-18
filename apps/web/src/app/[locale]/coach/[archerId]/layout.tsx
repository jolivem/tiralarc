import { notFound } from 'next/navigation';
import { BinderTabs } from '@/components/binder/binder-tabs';
import binder from '@/components/binder/binder.module.css';
import { redirect } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { getAthlete } from '@/lib/coaching';
import { getCurrentUser } from '@/lib/current-user';

const UUID = /^[0-9a-f-]{36}$/;

/**
 * A coach in one of their archers' journals: the archer's binder, with the Journal and
 * Indicators tabs only. Anyone who doesn't coach that archer gets a 404 (as from the API).
 */
export default async function CoachArcherLayout({
  children,
  params,
}: LayoutProps<'/[locale]/coach/[archerId]'>) {
  const { locale, archerId } = await params;
  if (!(await getCurrentUser())) {
    return redirect({
      href: { pathname: '/login', query: { next: `/coach/${archerId}/journal` } },
      locale: locale as Locale,
    });
  }
  if (!UUID.test(archerId) || !(await getAthlete(archerId))) notFound();
  return (
    <div className={binder.binder}>
      <BinderTabs archerId={archerId} />
      {children}
    </div>
  );
}
