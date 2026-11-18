import { Alert, Box, Container, Stack, Text } from '@mantine/core';
import { IconLogin, IconMailOpened, IconUserPlus } from '@tabler/icons-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PreviewPrint } from '@/components/home/preview-print';
import { ReviewsStrip } from '@/components/reviews/reviews-strip';
import { ButtonLink } from '@/components/links';
import { NotebookCover } from '@/components/notebook/cover';
import { HandHeading } from '@/components/notebook/notebook';
import { redirect } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { api } from '@/lib/api';
import { getCurrentUser, homePathFor } from '@/lib/current-user';
import classes from './home.module.css';

/** FAQ entries, in order: message keys under `home.faq`. */
const FAQ = [
  'audience',
  'start',
  'journal',
  'events',
  'planning',
  'competitions',
  'progress',
  'share',
  'devices',
] as const;

/**
 * Screenshots of the notebook (public/home/, made-up data), their size. A new screenshot gets a
 * new file name: browsers and the image optimiser keep the old one under the same name.
 */
const PREVIEWS = [
  { key: 'home', file: 'notebook-home-2026-11.webp', width: 1200, height: 938 },
  { key: 'journal', file: 'notebook-journal-cerisier-2026-11.webp', width: 1200, height: 1280 },
  { key: 'sheet', file: 'notebook-sheet-photo.webp', width: 1200, height: 909 },
  { key: 'stats', file: 'notebook-stats-2026-11.webp', width: 1200, height: 1313 },
] as const;

/** `?invitation=`: the visitor comes from an invitation email (see accept-invitation-form.tsx). */
const INVITATIONS = ['accepted', 'coach'] as const;

export default async function HomePage({ params, searchParams }: PageProps<'/[locale]'>) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const user = await getCurrentUser();
  if (user) return redirect({ href: homePathFor(user.roles), locale: locale as Locale });
  // What users think of the app (approved reviews), under the FAQ.
  const { data: reviews } = await api.GET('/api/v1/reviews');
  const t = await getTranslations('home');
  const { invitation: requested } = await searchParams;
  const invitation = INVITATIONS.find((kind) => kind === requested);

  // On the desk: the welcome, the closed notebook, then the FAQ on a sheet torn out of a spiral notebook.
  return (
    // Wide enough for the notebook and a column of prints on each side.
    <Container size="lg" px={0}>
      <Stack gap={48}>
        {invitation && (
          // A guest who accepted an invitation (or a coach without an account yet): what the
          // site is for is below, then the button to create their account.
          <Alert
            variant="light"
            color="teal"
            radius="lg"
            maw={680}
            mx="auto"
            icon={<IconMailOpened size={20} />}
            title={t(`invitation.${invitation}.title`)}
          >
            {t(`invitation.${invitation}.body`)}
          </Alert>
        )}
        <Box maw={720} mx="auto" ta="center">
          {/* The tagline first, large: what the site is, in one line. */}
          <h1 className={classes.hook}>{t('hook')}</h1>
          <Text size="lg">{t('welcomeBody')}</Text>
        </Box>

        {/*
          The closed notebook in the middle, a glance inside on either side: screenshots of the
          notebook with a made-up season (public/home/, taken from the app), square, laid on the
          desk like prints taped down, each with its caption. Phones: the notebook, then the
          prints two by two.
        */}
        <section className={classes.showcase} aria-label={t('preview.title')}>
          <div className={classes.showcaseCover}>
            <NotebookCover>
              <HandHeading order={3}>{t('ctaTitle')}</HandHeading>
              {/* Leather browns: dark for signing up, light tan for signing in. */}
              <Stack gap="sm">
                <ButtonLink
                  href="/register"
                  size="md"
                  color="#3f2817"
                  leftSection={<IconUserPlus size={18} />}
                >
                  {t('register')}
                </ButtonLink>
                <ButtonLink
                  href="/login"
                  size="md"
                  color="#d4b089"
                  autoContrast
                  leftSection={<IconLogin size={18} />}
                >
                  {t('login')}
                </ButtonLink>
              </Stack>
            </NotebookCover>
          </div>
          {[PREVIEWS.slice(0, 2), PREVIEWS.slice(2)].map((side, s) => (
            <div key={s} className={classes.showcaseSide} data-side={s === 0 ? 'left' : 'right'}>
              {side.map(({ key, file, width, height }, i) => (
                // A click opens it enlarged in a window, closed by its cross.
                <PreviewPrint
                  key={key}
                  src={`/home/${file}`}
                  alt={t(`preview.${key}Alt`)}
                  caption={t(`preview.${key}`)}
                  width={width}
                  height={height}
                  tilt={(s + i) % 2 === 0 ? -1.6 : 1.4}
                />
              ))}
            </div>
          ))}
        </section>

        <div className={classes.tornShadow}>
          <section className={classes.tornSheet}>
            <h2 className={classes.faqTitle}>{t('faqTitle')}</h2>
            {FAQ.map((key) => (
              <details key={key} className={classes.question}>
                <summary>{t(`faq.${key}.question`)}</summary>
                <p className={classes.answer}>{t(`faq.${key}.answer`)}</p>
              </details>
            ))}
          </section>
        </div>

        <ReviewsStrip reviews={reviews ?? []} />
      </Stack>
    </Container>
  );
}
