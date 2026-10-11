'use client';

import { Text } from '@mantine/core';
import type { CSSProperties } from 'react';
import { Link } from '@/i18n/navigation';
import { ARCHER_SECTIONS, type SectionKey } from './sections';
import classes from './section-card.module.css';

/** Slight tilts, so a row of notes looks stuck by hand. */
const TILTS = ['-2deg', '1.5deg', '-1deg', '2deg'];

/**
 * Sticky note leading to an archer section (home notebook), in the colour of the
 * section's divider tab.
 */
export function SectionCard({
  section,
  title,
  description,
  index = 0,
}: {
  section: Exclude<SectionKey, 'home'>;
  title: string;
  description: string;
  /** Position in its row, for the tilt. */
  index?: number;
}) {
  const { href, color, icon: Icon } = ARCHER_SECTIONS.find(({ key }) => key === section)!;
  const style = {
    '--note-light': `var(--mantine-color-${color}-1)`,
    '--note-dark': `var(--mantine-color-${color}-9)`,
    '--note-ink': `var(--mantine-color-${color}-9)`,
    '--tilt': TILTS[index % TILTS.length],
  } as CSSProperties;

  return (
    <Link href={href} className={classes.note} style={style}>
      <span className={classes.title}>
        <Icon size={20} stroke={2} />
        {title}
      </span>
      <Text size="sm" className={classes.description}>
        {description}
      </Text>
    </Link>
  );
}
