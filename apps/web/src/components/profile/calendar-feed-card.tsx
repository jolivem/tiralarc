'use client';

import { Button, CopyButton, Group, Stack, Text, TextInput } from '@mantine/core';
import { IconCalendarShare, IconCheck, IconCopy, IconLinkOff } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { createCalendarFeed, removeCalendarFeed } from '@/app/actions/profile';
import { FormError } from '@/components/form-feedback';
import type { ActionState } from '@/lib/action-state';
import { ProfileCard } from './list-card';

/**
 * Profile page: the calendar subscription link (iCal), for Google Agenda, the iPhone's calendar,
 * Outlook… The link is shown once, when made (only its hash is kept): a lost one is renewed,
 * which turns the old one off.
 */
export function CalendarFeedCard({ active: initiallyActive }: { active: boolean }) {
  const t = useTranslations('profile.calendarFeed');
  const [active, setActive] = useState(initiallyActive);
  const [url, setUrl] = useState<string | null>(null);
  const [state, setState] = useState<ActionState>({});
  const [pending, start] = useTransition();

  const create = () =>
    start(async () => {
      const result = await createCalendarFeed();
      setState(result);
      if (result.url) {
        setUrl(result.url);
        setActive(true);
      }
    });
  const remove = () =>
    start(async () => {
      const result = await removeCalendarFeed();
      setState(result);
      if (!result.code) {
        setUrl(null);
        setActive(false);
      }
    });

  return (
    <ProfileCard title={t('title')}>
      <Stack gap="sm">
        <Text size="sm" c="dimmed">
          {t('hint')}
        </Text>
        {url && (
          <>
            <Group gap="xs" wrap="nowrap" align="flex-end">
              <TextInput
                label={t('link')}
                value={url}
                readOnly
                style={{ flex: 1 }}
                onFocus={(e) => e.currentTarget.select()}
              />
              <CopyButton value={url}>
                {({ copied, copy }) => (
                  <Button
                    variant="default"
                    leftSection={copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                    onClick={copy}
                  >
                    {copied ? t('copied') : t('copy')}
                  </Button>
                )}
              </CopyButton>
            </Group>
            <Text size="xs" c="dimmed">
              {t('keepSecret')}
            </Text>
          </>
        )}
        {active && !url && <Text size="sm">{t('active')}</Text>}
        <Group gap="sm">
          <Button
            variant={active ? 'default' : 'light'}
            leftSection={<IconCalendarShare size={18} />}
            loading={pending}
            onClick={create}
          >
            {active ? t('renew') : t('create')}
          </Button>
          {active && (
            <Button
              variant="subtle"
              color="red"
              leftSection={<IconLinkOff size={18} />}
              disabled={pending}
              onClick={remove}
            >
              {t('remove')}
            </Button>
          )}
        </Group>
        <FormError state={state} />
      </Stack>
    </ProfileCard>
  );
}
