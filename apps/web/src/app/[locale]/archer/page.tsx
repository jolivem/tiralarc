import { Box, SimpleGrid, Stack, Text } from '@mantine/core';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import binder from '@/components/binder/binder.module.css';
import { ExportCard } from '@/components/export/export-card';
import { FirstJournalPrompt } from '@/components/journal/journal-modal';
import { CompetitionPlanningCard } from '@/components/journal/competition-planning';
import { MonthsOverview } from '@/components/journal/months-overview';
import { NewEvents } from '@/components/journal/new-events';
import { SeasonCalendar } from '@/components/journal/season-calendar';
import { RegularityCard } from '@/components/journal/regularity-card';
import { TodayEntry } from '@/components/journal/today-entry';
import { ToComplete } from '@/components/journal/to-complete';
import { HandHeading, HandNote, Notebook } from '@/components/notebook/notebook';
import { RuledHeading, RuledPenRule } from '@/components/notebook/on-ruling';
import { AlignedSpacer, AlignedTop, PageAlignment } from '@/components/notebook/page-alignment';
import { SectionCard } from '@/components/section-card';
import type { Locale } from '@/i18n/routing';
import { FavoriteIndicatorProvider } from '@/components/stats/favorite';
import { IndicatorCard } from '@/components/stats/favorite-card';
import { RuledCardTitles } from '@/components/stats/stats-cards';
import { CompetitionsToPlan } from '@/components/journal/competition-list';
import { getAuthedApi } from '@/lib/api';
import { getArcherProfile } from '@/lib/archer-profile';
import { getCurrentUser } from '@/lib/current-user';
import { RANKED_DISCIPLINES } from '@/lib/export-options';
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
  // Practising in France (or not said yet): the FFTA's competitions and rankings show.
  const ffta = profile?.practisesInFrance !== false;
  // What they depend on: kept an hour in the browser, read again once any of it changes.
  const fftaScope = JSON.stringify([
    user?.id,
    profile?.licenceNumber,
    profile?.category,
    profile?.bowType,
    profile?.disciplines,
    profile?.departments,
    profile?.paraCompetitions,
  ]);

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
  // The selected journal's events up to today: its regularity, and (those before today) the
  // reviews still to write.
  const pastTo = selected && selected.endDate < today ? selected.endDate : today;
  const { data: seasonSessions } =
    selected && selected.startDate <= pastTo
      ? await api.GET('/api/v1/journal/sessions', {
          params: { query: { from: selected.startDate, to: pastTo } },
        })
      : { data: undefined };
  const pastSessions = (seasonSessions ?? []).filter((s) => s.date < today);

  // The day, in the notebook's top right corner: on the right page from desktops up,
  // on the first page when the pages are stacked. A click on it (or its pen) notes an event today.
  const date = (
    <HandNote align="end">
      <TodayEntry
        label={format.dateTime(new Date(`${today}T12:00:00`), { dateStyle: 'full' })}
        today={today}
        journal={selected ?? null}
        customTypes={customTypes ?? []}
        className={home.date}
      />
    </HandNote>
  );

  // Two sticky notes side by side; `first` numbers them across both pages (tilts).
  const notes = (sections: readonly NoteSection[], first: number) => (
    // Room above each note for its strip of tape, and some air under the heading.
    <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="xl" verticalSpacing="xl" pt={36}>
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
  // No gap between the blocks: each title sits on the first free line after what comes before.
  const left = (
    <Stack gap={0} h="100%">
      <Box hiddenFrom="md">{date}</Box>
      {/*
        The top left blank, as tall as the right page's top (no gap after it, as there): the
        calendar's heading falls on the national ranking's line.
      */}
      <div>
        <AlignedSpacer />
        {selected ? (
          <>
            <RuledHeading raised>{t('calendar')}</RuledHeading>
            {/* A click opens the whole season. */}
            <SeasonCalendar
              journal={selected}
              today={today}
              customTypes={customTypes ?? []}
              ffta={ffta}
            >
              <MonthsOverview
                months={months}
                today={today}
                sessions={sessions ?? []}
                cols={{ base: 1, xs: 2 }}
                ruled
              />
            </SeasonCalendar>
          </>
        ) : (
          <Text c="dimmed">{tJournals('noneBody')}</Text>
        )}
      </div>
      <NewEvents events={newEvents ?? []} hasPlanningCoach={hasPlanningCoach} />
      <ToComplete sessions={pastSessions} />
      {/* The PDF extract, over the selected journal's period at first. */}
      <ExportCard
        from={selected?.startDate ?? `${today.slice(0, 7)}-01`}
        to={selected?.endDate ?? today}
        disciplines={ffta ? RANKED_DISCIPLINES.filter((d) => profile?.disciplines.includes(d)) : []}
      />
      {/* A blank line at least above the pen rule (on both pages: they stay level). */}
      <Box mt="auto" pt="var(--line)">
        {/* A pen rule above the sections, across both pages, sets them off. */}
        <RuledHeading penRule>{t('sections')}</RuledHeading>
        {notes(LEFT_NOTES, 0)}
      </Box>
    </Stack>
  );

  // On the right, under the day: the FFTA competitions still to plan (only when practising in
  // France; the national rankings are on the Indicators page), then the favourite indicator, its star filled (a click there takes it off
  // the home page).
  const right = (
    <Stack gap={0} h="100%">
      {/* The first heading right under the day, level with the calendar's. */}
      <div>
        <AlignedTop>
          <Box visibleFrom="md">{date}</Box>
        </AlignedTop>
        {selected ? (
          <RegularityCard
            sessions={seasonSessions ?? []}
            startDate={selected.startDate}
            today={today}
            raised
          />
        ) : (
          ffta && <CompetitionsToPlan today={today} cacheScope={fftaScope} raised />
        )}
      </div>
      {selected && ffta && <CompetitionsToPlan today={today} cacheScope={fftaScope} />}
      {/* The FFTA competitions still to come this season, in a dialog. */}
      {ffta && selected && (
        <CompetitionPlanningCard
          journal={selected}
          today={today}
          // The starting town (Profile page), for the map's distances to travel.
          home={
            profile?.homeTown && profile.homeLatitude !== null && profile.homeLongitude !== null
              ? {
                  name: profile.homeTown,
                  latitude: profile.homeLatitude,
                  longitude: profile.homeLongitude,
                }
              : null
          }
        />
      )}
      {favorite && favoriteStats && (
        <RuledCardTitles value>
          <FavoriteIndicatorProvider initial={favorite}>
            <IndicatorCard
              compact
              indicator={favorite}
              stats={favoriteStats.stats}
              period={favoriteStats.span}
              today={favoriteStats.today}
            />
          </FavoriteIndicatorProvider>
        </RuledCardTitles>
      )}
      <Box mt="auto" pt="var(--line)">
        <RuledPenRule />
        {notes(RIGHT_NOTES, LEFT_NOTES.length)}
      </Box>
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
      </div>
      <PageAlignment>
        <Notebook left={left} right={right} label={t('home')} className={home.home} />
      </PageAlignment>
      {journals.length === 0 && <FirstJournalPrompt />}
    </>
  );
}
