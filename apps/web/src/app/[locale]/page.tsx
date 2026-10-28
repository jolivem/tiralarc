import { Alert, Box, Container, Stack, Text } from '@mantine/core';
import { IconLogin, IconMailOpened, IconUserPlus } from '@tabler/icons-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ButtonLink } from '@/components/links';
import { NotebookCover } from '@/components/notebook/cover';
import { HandHeading } from '@/components/notebook/notebook';
import { redirect } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { getCurrentUser, homePathFor } from '@/lib/current-user';
import classes from './home.module.css';

/** FAQ entries, in order: message keys under `home.faq`. */
const FAQ = ['audience', 'start', 'journal', 'events', 'planning', 'progress', 'devices'] as const;

/** `?invitation=`: the visitor comes from an invitation email (see accept-invitation-form.tsx). */
const INVITATIONS = ['accepted', 'coach'] as const;

export default async function HomePage({ params, searchParams }: PageProps<'/[locale]'>) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const user = await getCurrentUser();
  if (user) return redirect({ href: homePathFor(user.roles), locale: locale as Locale });
  const t = await getTranslations('home');
  const { invitation: requested } = await searchParams;
  const invitation = INVITATIONS.find((kind) => kind === requested);

  // On the desk: the welcome, the closed notebook, then the FAQ on a sheet torn out of a spiral notebook.
  return (
    <Container size="md" px={0}>
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
        <Box maw={680} mx="auto" ta="center">
          <HandHeading order={2}>{t('welcomeTitle')}</HandHeading>
          <Text size="lg">{t('welcomeBody')}</Text>
        </Box>

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
      </Stack>
    </Container>
  );
}
