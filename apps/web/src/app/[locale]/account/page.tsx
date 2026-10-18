import {
  Avatar,
  Badge,
  Card,
  Container,
  Group,
  Stack,
  Table,
  TableTbody,
  TableTd,
  TableTh,
  TableTr,
  Text,
  Title,
} from '@mantine/core';
import { IconX } from '@tabler/icons-react';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { AthletesCard } from '@/components/coach/athletes-card';
import { JournalsCard } from '@/components/journal/journals-card';
import { ActionIconLink } from '@/components/links';
import { redirect } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { getAthletes } from '@/lib/coaching';
import { getCurrentUser } from '@/lib/current-user';
import { getJournals, getSelectedJournal } from '@/lib/journals';

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

  // Journals are an archer's: coaches who are not archers don't see the card.
  const isArcher = user.roles.includes('ARCHER');
  const [journals, selected, athletes] = await Promise.all([
    isArcher ? getJournals() : [],
    isArcher ? getSelectedJournal() : null,
    user.roles.includes('COACH') ? getAthletes() : null,
  ]);

  const name = user.displayName ?? user.email;
  const methods = [
    ...(user.hasPassword ? [t('account.methodPassword')] : []),
    ...user.providers.map((p) => PROVIDER_LABELS[p]),
  ];

  return (
    <Container size="md" px={0}>
      <Stack gap="lg">
        <Group justify="space-between" wrap="nowrap" align="flex-start">
          <Group gap="md" wrap="nowrap">
            <Avatar name={name} color="initials" size="lg" />
            <Title order={1} size="h2">
              {t('account.title')}
            </Title>
          </Group>
          {/* The archer menu is hidden here (app-shell.tsx): this closes the page, back to it. */}
          {isArcher && (
            <ActionIconLink
              href="/archer"
              variant="subtle"
              color="var(--mantine-color-text)"
              size="xl"
              radius="xl"
              aria-label={t('account.close')}
              title={t('account.close')}
            >
              <IconX size={28} stroke={2} />
            </ActionIconLink>
          )}
        </Group>

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
                  {/* Shown only: every account is an archer, a coach while an archer invites them. */}
                  <Group gap={6}>
                    {user.roles.map((role) => (
                      <Badge key={role} color={ROLE_COLORS[role]} variant="light">
                        {t(`roles.${role}`)}
                      </Badge>
                    ))}
                  </Group>
                  <Text size="xs" c="dimmed" mt={6}>
                    {t('account.rolesHint')}
                  </Text>
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

        {isArcher && <JournalsCard journals={journals} selectedId={selected?.id ?? null} />}
        {/* Coaches only: the archers who invited them, and their journals. */}
        {athletes && <AthletesCard athletes={athletes} />}
      </Stack>
    </Container>
  );
}
