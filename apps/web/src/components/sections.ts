import { IconChartLine, IconFileText, IconHome, IconId, IconNotebook } from '@tabler/icons-react';
import type { ComponentType, CSSProperties } from 'react';

export type SectionKey = 'home' | 'journal' | 'sheets' | 'stats' | 'profile';

export interface ArcherSection {
  /** Message key under `archer`. */
  key: SectionKey;
  /** '/archer/…', or '/coach/<archerId>/…' for a coach in one of their archers' journals. */
  href: string;
  /** Mantine palette colour: the divider tab in the menu, the sticky note on the home page. */
  color: string;
  /** Pastel open tab: a light shade with dark text, instead of the full colour with white text. */
  pastel?: boolean;
  icon: ComponentType<{ size?: number; stroke?: number }>;
}

/** The archer area, in menu order. Each section keeps its colour wherever it shows. */
export const ARCHER_SECTIONS: readonly ArcherSection[] = [
  { key: 'home', href: '/archer', color: 'green', pastel: true, icon: IconHome },
  { key: 'journal', href: '/archer/journal', color: 'orange', icon: IconNotebook },
  { key: 'sheets', href: '/archer/sheets', color: 'blue', icon: IconFileText },
  { key: 'stats', href: '/archer/stats', color: 'grape', icon: IconChartLine },
  { key: 'profile', href: '/archer/profile', color: 'pink', icon: IconId },
];

/**
 * What a coach sees of one of their archers (the journal of the season in progress and the
 * indicators), with the colours of the archer's own sections.
 */
export function coachSections(archerId: string): ArcherSection[] {
  return ARCHER_SECTIONS.filter(({ key }) => key === 'journal' || key === 'stats').map(
    (section) => ({ ...section, href: section.href.replace('/archer', `/coach/${archerId}`) }),
  );
}

/** "/coach/<archerId>/…" → the archer's id; undefined elsewhere. */
export function coachedArcherOf(pathname: string): string | undefined {
  return /^\/coach\/([0-9a-f-]{36})(?:\/|$)/.exec(pathname)?.[1];
}

/** A section's divider tab colours: tinted when closed, `--tab-filled` / `--tab-on-filled` open. */
export function tabColors({ color, pastel }: ArcherSection): CSSProperties {
  return {
    '--tab-filled': pastel
      ? `var(--mantine-color-${color}-3)`
      : `var(--mantine-color-${color}-filled)`,
    '--tab-on-filled': pastel ? `var(--mantine-color-${color}-9)` : 'var(--mantine-color-white)',
    '--tab-light': `var(--mantine-color-${color}-light)`,
    '--tab-text': `var(--mantine-color-${color}-light-color)`,
  } as CSSProperties;
}

/** The section a path belongs to (the home page only matches exactly). */
export function sectionOf(
  pathname: string,
  sections: readonly ArcherSection[] = ARCHER_SECTIONS,
): ArcherSection | undefined {
  return sections.find(({ href }) =>
    href === '/archer' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`),
  );
}
