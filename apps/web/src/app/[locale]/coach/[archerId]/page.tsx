import { redirect } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';

/** An archer's binder opens on their journal. */
export default async function CoachArcherPage({ params }: PageProps<'/[locale]/coach/[archerId]'>) {
  const { locale, archerId } = await params;
  return redirect({ href: `/coach/${archerId}/journal`, locale: locale as Locale });
}
