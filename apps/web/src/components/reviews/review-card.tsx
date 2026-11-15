'use client';

import { Button, Card, Group, Rating, Stack, Text, Textarea, Title } from '@mantine/core';
import { IconSend } from '@tabler/icons-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { submitReview } from '@/app/actions/reviews';
import { FormError, SuccessNotice } from '@/components/form-feedback';
import type { ActionState } from '@/lib/action-state';

/** The comment's longest, as the API takes it. */
const MAX_COMMENT = 1000;

/**
 * Account page: rate the app (stars, clicked) and say what you think of it (free text). Sent
 * for approval (the moderators' email) before it may show on the home page; one a day: until
 * `nextAllowedAt`, the card thanks and says when the next one may be written.
 */
export function ReviewCard({ nextAllowedAt: initialNext }: { nextAllowedAt: string | null }) {
  const t = useTranslations('reviews');
  const format = useFormatter();
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [nextAllowedAt, setNextAllowedAt] = useState(initialNext);
  const [state, setState] = useState<ActionState>({});
  const [pending, startTransition] = useTransition();
  const waiting = nextAllowedAt !== null && new Date(nextAllowedAt) > new Date();

  const submit = () =>
    startTransition(async () => {
      const result = await submitReview(stars, comment.trim());
      setState(result);
      if (!result.code) {
        setNextAllowedAt(result.nextAllowedAt ?? null);
        setStars(0);
        setComment('');
      }
    });

  return (
    <Card withBorder radius="lg" padding="lg">
      <Stack gap="sm">
        <Title order={2} size="h4">
          {t('title')}
        </Title>
        {waiting ? (
          <>
            {state.notice === 'sent' && <SuccessNotice>{t('thanks')}</SuccessNotice>}
            <Text size="sm" c="dimmed">
              {t('nextAt', {
                date: format.dateTime(new Date(nextAllowedAt!), {
                  weekday: 'long',
                  hour: '2-digit',
                  minute: '2-digit',
                }),
              })}
            </Text>
          </>
        ) : (
          <>
            <Text size="sm" c="dimmed">
              {t('intro')}
            </Text>
            <Group gap="sm" align="center">
              <Rating
                value={stars}
                onChange={setStars}
                size="xl"
                aria-label={t('stars')}
                getSymbolLabel={(value) => t('starsValue', { count: value })}
              />
              {stars > 0 && (
                <Text size="sm" c="dimmed">
                  {t(`levels.${String(stars) as '1' | '2' | '3' | '4' | '5'}`)}
                </Text>
              )}
            </Group>
            <Textarea
              label={t('comment')}
              placeholder={t('commentPlaceholder')}
              value={comment}
              onChange={(e) => setComment(e.currentTarget.value)}
              autosize
              minRows={3}
              maxRows={8}
              maxLength={MAX_COMMENT}
              description={t('moderated')}
            />
            <FormError state={state} />
            <Group justify="flex-end">
              <Button
                leftSection={<IconSend size={18} />}
                onClick={submit}
                loading={pending}
                disabled={stars === 0 || comment.trim() === ''}
              >
                {t('send')}
              </Button>
            </Group>
          </>
        )}
      </Stack>
    </Card>
  );
}
