import { VisuallyHidden } from '@mantine/core';
import { IconSquare, IconSquareCheck } from '@tabler/icons-react';
import type { ArcherProfile, Invitation, Journal } from '@tiralarc/api-client';
import { getTranslations } from 'next-intl/server';
import { RuledHeading } from '@/components/notebook/on-ruling';
import { RuledStack } from '@/components/notebook/ruled-stack';
import { Link } from '@/i18n/navigation';
import { GettingStartedHide } from './getting-started-hide';
import classes from './journal.module.css';

/** Its `toursSeen` entry once hidden (or done): it doesn't show again. */
export const GETTING_STARTED = 'getting-started';

type Step = { key: 'profile' | 'event' | 'coach' | 'decor'; done: boolean; href: string };

/**
 * Home page, left page, for a new archer: "Pour bien démarrer", a short list to tick — the
 * profile filled in (bow and category; the licence too in France), a first event noted, a coach
 * invited, a month decorated. Each leads where it is done; ticked ones are crossed out, and the
 * list stays until hidden ("Masquer", kept in `toursSeen`). Written on the notebook's lines, one
 * step per line.
 */
export async function GettingStarted({
  profile,
  journals,
  invitations,
}: {
  profile: ArcherProfile | null;
  journals: Journal[];
  invitations: Invitation[];
}) {
  if ((profile?.toursSeen ?? []).includes(GETTING_STARTED) || journals.length === 0) return null;
  const inFrance = profile?.practisesInFrance !== false;
  const steps: Step[] = [
    {
      key: 'profile',
      done: Boolean(profile?.bowType && profile.category && (!inFrance || profile.licenceNumber)),
      href: '/archer/profile',
    },
    { key: 'event', done: journals.some((j) => j.sessionCount > 0), href: '/archer/journal' },
    { key: 'coach', done: invitations.some((i) => i.isCoach), href: '/archer/profile' },
    {
      key: 'decor',
      done: journals.some((j) => j.monthThemes.some((m) => m.theme !== null)),
      href: '/archer/journal',
    },
  ];
  const t = await getTranslations('archer.gettingStarted');

  return (
    <section>
      <RuledStack>
        <RuledHeading highlight="yellow">{t('title')}</RuledHeading>
        <ul className={classes.newEvents}>
          {steps.map(({ key, done, href }) => (
            <li key={key}>
              <Link href={href} className={classes.newEvent} data-done={done || undefined}>
                {done ? (
                  <IconSquareCheck size={20} color="var(--mantine-color-teal-filled)" aria-hidden />
                ) : (
                  <IconSquare size={20} aria-hidden />
                )}
                <span className={done ? classes.gettingStartedDone : classes.newEventText}>
                  {t(`steps.${key}`)}
                  {done && <VisuallyHidden>{` (${t('done')})`}</VisuallyHidden>}
                </span>
              </Link>
            </li>
          ))}
          <li>
            <GettingStartedHide label={t('hide')} />
          </li>
        </ul>
      </RuledStack>
    </section>
  );
}
