import { Box, SimpleGrid, Stack, Text } from '@mantine/core';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import binder from '@/components/binder/binder.module.css';
import { FirstJournalPrompt } from '@/components/journal/journal-modal';
import { MonthsOverview } from '@/components/journal/months-overview';
import { NewEvents } from '@/components/journal/new-events';
import { SeasonCalendar } from '@/components/journal/season-calendar';
import { HandHeading, HandNote, Notebook } from '@/components/notebook/notebook';
import { SectionCard } from '@/components/section-card';
import type { Locale } from '@/i18n/routing';
import { FavoriteIndicatorProvider } from '@/components/stats/favorite';
import { IndicatorCard } from '@/components/stats/favorite-card';
import { getAuthedApi } from '@/lib/api';
import { getArcherProfile } from '@/lib/archer-profile';
import { getCurrentUser } from '@/lib/current-user';
import { getJournals, getSelectedJournal } from '@/lib/journals';
import { getStats } from '@/lib/stats';
import home from './home.module.css';

type NoteSection = 'journal' | 'sheets' | 'stats' | 'profile';
/** The sections' sticky notes: two at the bottom of each page. */
const LEFT_NOTES: readonly NoteSection[] = ['journal', 'sheets'];
const RIGHT_NOTES: readonly NoteSection[] = ['stats', 'profile'];
/** Months shown in the notebook: the current one and the next. */
const OVERVIEW_MONTHS = 2;

/** "YYYY-MM" of the month `offset` months after `month`. */
function addMonths(month: string, offset: number): string {
  const [year, index] = month.split('-').map(Number) as [number, number];
  const date = new Date(Date.UTC(year, index - 1 + offset, 1));
  return date.toISOString().slice(0, 7);
}

export default async function ArcherHomePage({ params }: PageProps<'/[locale]/archer'>) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations('archer');
  const tJournals = await getTranslations('journals');
  const format = await getFormatter();
  const api = await getAuthedApi();
  const [
    user,
    journals,
    selected,
    profile,
    { data: customTypes },
    { data: newEvents },
    { data: invitations },
  ] = await Promise.all([
    getCurrentUser(),
    getJournals(),
    getSelectedJournal(),
    getArcherProfile(),
    // For the legend of the whole season's calendar.
    api.GET('/api/v1/journal/event-types'),
    // Planned by the coach, not opened yet.
    api.GET('/api/v1/journal/sessions/new'),
    // Whether a coach (who accepted, with planning access) can propose events.
    api.GET('/api/v1/profile/invitations'),
  ]);
  const hasPlanningCoach = (invitations ?? []).some(
    (i) => i.isCoach && i.status === 'ACCEPTED' && i.coachAccess === 'WRITE',
  );
  // The favourite indicator (starred on the Indicators page), over the selected journal.
  const favorite = profile?.favoriteIndicator ?? null;
  const favoriteStats = favorite ? await getStats(selected ?? null) : null;

  // The selected journal's events over the months shown: those dated within its period.
  const today = new Date().toISOString().slice(0, 10);
  const months = Array.from({ length: OVERVIEW_MONTHS }, (_, i) => addMonths(today.slice(0, 7), i));
  const firstDay = `${months[0]}-01`;
  // The day before the first month not shown.
  const lastDay = new Date(
    Date.parse(`${addMonths(today.slice(0, 7), OVERVIEW_MONTHS)}-01`) - 86_400_000,
  )
    .toISOString()
    .slice(0, 10);
  const from = selected && selected.startDate > firstDay ? selected.startDate : firstDay;
  const to = selected && selected.endDate < lastDay ? selected.endDate : lastDay;
  const { data: sessions } =
    selected && from <= to
      ? await (
          await getAuthedApi()
        ).GET('/api/v1/journal/sessions', { params: { query: { from, to } } })
      : { data: undefined };

  // The day, in the notebook's top right corner: on the right page from desktops up,
  // on the first page when the pages are stacked.
  const date = (
    <HandNote align="end">
      {format.dateTime(new Date(`${today}T12:00:00`), { dateStyle: 'full' })}
    </HandNote>
  );

  // Two sticky notes side by side; `first` numbers them across both pages (tilts).
  const notes = (sections: readonly NoteSection[], first: number) => (
    // Room above each note for its strip of tape.
    <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="xl" verticalSpacing="xl" pt="xs">
      {sections.map((section, i) => (
        <SectionCard
          key={section}
          section={section}
          index={first + i}
          title={t(section)}
          description={t(`${section}Intro`)}
        />
      ))}
    </SimpleGrid>
  );

  // An open notebook: on the left, this month and the next side by side; on the right,
  // the day. The sections, stuck in as notes, line up at the bottom of both pages, two
  // per page.
  const left = (
    <Stack gap="lg" h="100%">
      <Box hiddenFrom="md">{date}</Box>
      {selected ? (
        <div>
          <HandHeading>{t('calendar')}</HandHeading>
          {/* A click opens the whole season. */}
          <SeasonCalendar journal={selected} today={today} customTypes={customTypes ?? []}>
            <MonthsOverview
              months={months}
              today={today}
              sessions={sessions ?? []}
              cols={{ base: 1, xs: 2 }}
            />
          </SeasonCalendar>
        </div>
      ) : (
        <Text c="dimmed">{tJournals('noneBody')}</Text>
      )}
      <NewEvents events={newEvents ?? []} hasPlanningCoach={hasPlanningCoach} />
      <Box mt="auto">
        <HandHeading>{t('sections')}</HandHeading>
        {notes(LEFT_NOTES, 0)}
      </Box>
    </Stack>
  );

  // On the right, under the day: the favourite indicator, its star filled (a click there
  // takes it off the home page).
  const right = (
    <Stack gap="xl" h="100%">
      <Box visibleFrom="md">{date}</Box>
      {favorite && favoriteStats && (
        <FavoriteIndicatorProvider initial={favorite}>
          <IndicatorCard
            compact
            indicator={favorite}
            stats={favoriteStats.stats}
            period={favoriteStats.span}
            today={favoriteStats.today}
          />
        </FavoriteIndicatorProvider>
      )}
      <Box mt="auto">{notes(RIGHT_NOTES, LEFT_NOTES.length)}</Box>
    </Stack>
  );

  // Direct children of the archer layout's grid: the greeting sits on the desk above the
  // notebook, and the divider tabs start level with the notebook.
  return (
    <>
      {/* Titles and date in the archer's calligraphy font, in bold (home.module.css). */}
      <div className={`${binder.header} ${home.home}`}>
        <HandHeading order={1}>
          {t('homeTitle', { name: user?.displayName ?? user?.email ?? '' })}
        </HandHeading>
        <Text c="dimmed">{t('homeIntro')}</Text>
      </div>
      <Notebook left={left} right={right} label={t('home')} className={home.home} />
      {journals.length === 0 && <FirstJournalPrompt />}
    </>
  );
}
