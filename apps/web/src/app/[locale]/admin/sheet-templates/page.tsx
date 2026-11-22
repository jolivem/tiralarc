import { Container } from '@mantine/core';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { SheetTemplatesAdmin } from '@/components/admin/sheet-templates-admin';
import type { Locale } from '@/i18n/routing';
import { getAuthedApi } from '@/lib/api';
import { getCurrentUser } from '@/lib/current-user';

/** Admins: the sheet templates offered by "+" in the Sheets binder, in both languages. */
export default async function SheetTemplatesAdminPage({
  params,
}: PageProps<'/[locale]/admin/sheet-templates'>) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  // Anyone else gets a 404, as from the API's 403 (proxy.ts sends anonymous visitors to sign in).
  const user = await getCurrentUser();
  if (!user?.roles.includes('ADMIN')) notFound();
  const { data: templates } = await (await getAuthedApi()).GET('/api/v1/admin/sheet-templates');

  return (
    <Container size="lg" py="md" w="100%">
      <SheetTemplatesAdmin templates={templates ?? []} />
    </Container>
  );
}
