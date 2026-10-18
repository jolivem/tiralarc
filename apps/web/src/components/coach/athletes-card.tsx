import { Badge, Card, Group, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconChartLine, IconNotebook, IconUsers } from '@tabler/icons-react';
import type { Athlete } from '@tiralarc/api-client';
import { getFormatter, getTranslations } from 'next-intl/server';
import { ButtonLink } from '@/components/links';

/**
 * Account page card of a coach: the archers who invited them as coach, each with their
 * journal of the season in progress (the only one the coach sees) and links to it.
 */
export async function AthletesCard({ athletes }: { athletes: Athlete[] }) {
  const t = await getTranslations('coach');
  const format = await getFormatter();
  // Noon, so the calendar day is the same in every time zone.
  const day = (date: string) =>
    format.dateTime(new Date(`${date}T12:00:00`), { dateStyle: 'medium' });

  return (
    <Card withBorder radius="lg" padding="lg">
      <Group gap="sm" wrap="nowrap" align="flex-start" mb="md">
        <ThemeIcon variant="light" size={40} radius="md">
          <IconUsers size={22} />
        </ThemeIcon>
        <div>
          <Text fw={600}>{t('title')}</Text>
          <Text size="sm" c="dimmed">
            {t('intro')}
          </Text>
        </div>
      </Group>
      {athletes.length === 0 ? (
        <Text size="sm" c="dimmed">
          {t('emptyBody')}
        </Text>
      ) : (
        <Stack gap="md">
          {athletes.map((athlete) => (
            <Group key={athlete.id} justify="space-between" gap="sm">
              <div style={{ minWidth: 0 }}>
                <Group gap="xs" wrap="nowrap">
                  <Text fw={500} truncate>
                    {athlete.name}
                  </Text>
                  <Badge
                    variant="light"
                    color={athlete.access === 'WRITE' ? 'orange' : 'gray'}
                    style={{ flexShrink: 0 }}
                  >
                    {t(`access.${athlete.access}`)}
                  </Badge>
                </Group>
                <Text size="sm" c="dimmed">
                  {athlete.journal
                    ? t('journalPeriod', {
                        title: athlete.journal.title,
                        start: day(athlete.journal.startDate),
                        end: day(athlete.journal.endDate),
                      })
                    : t('noJournal')}
                </Text>
              </div>
              {athlete.journal && (
                <Group gap="xs">
                  <ButtonLink
                    href={`/coach/${athlete.id}/journal`}
                    size="xs"
                    leftSection={<IconNotebook size={16} />}
                  >
                    {t('openJournal')}
                  </ButtonLink>
                  <ButtonLink
                    href={`/coach/${athlete.id}/stats`}
                    size="xs"
                    variant="default"
                    leftSection={<IconChartLine size={16} />}
                  >
                    {t('openStats')}
                  </ButtonLink>
                </Group>
              )}
            </Group>
          ))}
        </Stack>
      )}
    </Card>
  );
}
