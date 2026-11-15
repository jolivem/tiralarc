import { Alert, Blockquote, Rating, Stack, Text } from '@mantine/core';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { FormPage } from '@/components/page-shell';
import { ModerationButtons } from '@/components/reviews/moderation-buttons';
import type { Locale } from '@/i18n/routing';
import { api } from '@/lib/api';

/**
 * Landing page of the moderators' email (REVIEWS_EMAIL): the review, and the buttons that
 * publish it on the home page or refuse it. Opening the link decides nothing (mail scanners
 * open links): only the click does, once.
 */
export default async function ModerateReviewPage({
  params,
  searchParams,
}: PageProps<'/[locale]/reviews/moderate'>) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const { token } = await searchParams;
  const t = await getTranslations('reviews.moderation');
  const format = await getFormatter();
  const { data: review } =
    typeof token === 'string' && token
      ? await api.GET('/api/v1/reviews/moderation', { params: { query: { token } } })
      : { data: undefined };

  return (
    <FormPage title={t('title')}>
      {!review || typeof token !== 'string' ? (
        <Alert color="red" variant="light">
          {t('invalid')}
        </Alert>
      ) : (
        <Stack gap="md">
          <Stack gap={4} align="center">
            <Rating value={review.stars} readOnly size="lg" />
            <Text size="sm" c="dimmed">
              {review.authorName} ·{' '}
              {format.dateTime(new Date(`${review.date}T12:00:00Z`), {
                dateStyle: 'long',
                timeZone: 'UTC',
              })}
            </Text>
          </Stack>
          <Blockquote color="brown" style={{ whiteSpace: 'pre-wrap' }}>
            {review.comment}
          </Blockquote>
          {review.status === 'PENDING' ? (
            <ModerationButtons token={token} />
          ) : (
            <Alert color={review.status === 'PUBLISHED' ? 'teal' : 'gray'} variant="light">
              {t(review.status === 'PUBLISHED' ? 'alreadyPublished' : 'alreadyRefused')}
            </Alert>
          )}
        </Stack>
      )}
    </FormPage>
  );
}
