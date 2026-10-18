'use client';

import { Menu, Text, UnstyledButton } from '@mantine/core';
import { IconCheck, IconChevronDown } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { openAthleteJournal, openOwnJournal } from '@/app/actions/coaching';
import { usePathname } from '@/i18n/navigation';
import classes from './app-shell.module.css';
import { coachedArcherOf } from './sections';

/** What the header's journal menu offers (built by the root layout). */
export interface JournalChoices {
  /** The user's own journals (archers), most recent first. */
  own: { id: string; title: string }[];
  /** The archers they coach, with the title of their journal of the season in progress. */
  athletes: { id: string; name: string; journalTitle: string | null }[];
  /** The own journal the archer works in (see `getSelectedJournal`). */
  selectedId: string | null;
}

/**
 * The journal named in the middle of the header: the archer's selected journal, or, in a
 * coach's view, their archer's journal of the season in progress. With more than one journal
 * to choose from, a menu to switch: the user's own journals, then their archers' (those with a
 * journal in progress only).
 */
export function JournalMenu({
  choices,
  showOwn,
}: {
  choices: JournalChoices;
  /** The archer profile is active: the selected own journal is the one shown. */
  showOwn: boolean;
}) {
  const t = useTranslations('nav.journalMenu');
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const coachedId = coachedArcherOf(pathname);
  const athlete = coachedId ? choices.athletes.find((a) => a.id === coachedId) : undefined;
  const own = !coachedId && showOwn ? choices.own.find((j) => j.id === choices.selectedId) : null;

  const label = athlete
    ? athlete.journalTitle
      ? t('athleteJournal', { title: athlete.journalTitle, name: athlete.name })
      : athlete.name
    : (own?.title ?? null);
  // Only journals that can be opened: an archer without a journal in progress has none to show.
  const athletes = choices.athletes.filter((a) => a.journalTitle !== null);
  // A menu only when there is a choice to make; otherwise the shown journal's title alone.
  if (choices.own.length + athletes.length < 2) {
    return label ? (
      <Text className={classes.journalTitle} visibleFrom="sm" truncate>
        {label}
      </Text>
    ) : null;
  }

  const inArcherArea = pathname === '/archer' || pathname.startsWith('/archer/');
  return (
    <Menu position="bottom" width={320} withinPortal>
      <Menu.Target>
        <UnstyledButton
          className={classes.journalTitle}
          data-menu
          visibleFrom="sm"
          aria-label={t('label')}
          disabled={pending}
        >
          <Text component="span" inherit truncate>
            {label ?? t('choose')}
          </Text>
          <IconChevronDown size={16} style={{ flexShrink: 0 }} />
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>
        {choices.own.length > 0 && <Menu.Label>{t('own')}</Menu.Label>}
        {choices.own.map((journal) => {
          const current = journal.id === own?.id;
          return (
            <Menu.Item
              key={journal.id}
              rightSection={current ? <IconCheck size={14} /> : undefined}
              onClick={() =>
                startTransition(() => openOwnJournal(journal.id, inArcherArea && showOwn))
              }
            >
              {journal.title}
            </Menu.Item>
          );
        })}
        {athletes.length > 0 && <Menu.Label>{t('athletes')}</Menu.Label>}
        {athletes.map((a) => (
          <Menu.Item
            key={a.id}
            rightSection={a.id === coachedId ? <IconCheck size={14} /> : undefined}
            onClick={() => startTransition(() => openAthleteJournal(a.id))}
          >
            <Text size="sm" truncate>
              {a.name}
            </Text>
            <Text size="xs" c="dimmed" truncate>
              {a.journalTitle}
            </Text>
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}
