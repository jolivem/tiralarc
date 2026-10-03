import {
  Avatar,
  Badge,
  Card,
  Container,
  Group,
  SimpleGrid,
  Stack,
  Table,
  TableTbody,
  TableTd,
  TableTh,
  TableTr,
  Text,
  Title,
} from '@mantine/core';
import type { SelfAssignableRole } from '@tiralarc/api-client';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { RolesForm } from '@/components/auth-forms';
import { redirect } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { getCurrentUser } from '@/lib/current-user';

const PROVIDER_LABELS = { GOOGLE: 'Google', APPLE: 'Apple' } as const;
const ROLE_COLORS = { ADMIN: 'grape', ARCHER: 'teal', COACH: 'blue' } as const;

export default async function AccountPage({ params }: PageProps<'/[locale]/account'>) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations();
  const format = await getFormatter();

  const user = await getCurrentUser();
  // proxy.ts already redirects anonymous visitors; this covers a session revoked meanwhile.
  if (!user) {
    return redirect({
      href: { pathname: '/login', query: { next: '/account' } },
      locale: locale as Locale,
    });
  }

  const name = user.displayName ?? user.email;
  const methods = [
    ...(user.hasPassword ? [t('account.methodPassword')] : []),
    ...user.providers.map((p) => PROVIDER_LABELS[p]),
  ];

  return (
    <Container size="md" px={0}>
      <Stack gap="lg">
        <Group gap="md" wrap="nowrap">
          <Avatar name={name} color="initials" size="lg" />
          <Title order={1} size="h2">
            {t('account.title')}
          </Title>
        </Group>

        {/* One column on phones, two from tablets (sm) up. */}
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
          <Card withBorder radius="lg" padding="lg">
            <Table variant="vertical" layout="fixed" withRowBorders={false}>
              <TableTbody>
                <TableTr>
                  <TableTh w={130}>{t('account.email')}</TableTh>
                  <TableTd style={{ overflowWrap: 'anywhere' }}>{user.email}</TableTd>
                </TableTr>
                <TableTr>
                  <TableTh>{t('account.roles')}</TableTh>
                  <TableTd>
                    <Group gap={6}>
                      {user.roles.length === 0 && <Text c="dimmed">—</Text>}
                      {user.roles.map((role) => (
                        <Badge key={role} color={ROLE_COLORS[role]} variant="light">
                          {t(`roles.${role}`)}
                        </Badge>
                      ))}
                    </Group>
                  </TableTd>
                </TableTr>
                <TableTr>
                  <TableTh>{t('account.signInMethods')}</TableTh>
                  <TableTd>{methods.join(', ')}</TableTd>
                </TableTr>
                <TableTr>
                  <TableTh>{t('account.memberSince')}</TableTh>
                  <TableTd>
                    {format.dateTime(new Date(user.createdAt), { dateStyle: 'long' })}
                  </TableTd>
                </TableTr>
              </TableTbody>
            </Table>
          </Card>

          <Card withBorder radius="lg" padding="lg">
            <Stack gap="md">
              <Title order={2} size="h4">
                {t('account.editRoles')}
              </Title>
              <RolesForm
                initialRoles={user.roles.filter((r): r is SelfAssignableRole => r !== 'ADMIN')}
                submitLabel={t('account.save')}
              />
            </Stack>
          </Card>
        </SimpleGrid>
      </Stack>
    </Container>
  );
}
