'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { ARCHER_SECTIONS, coachSections, sectionOf, tabColors } from '../sections';
import classes from './binder.module.css';

/**
 * Binder divider tabs, from tablets up: long narrow tabs with vertical labels, stuck to
 * the left edge of the page content (archer/layout.tsx). The open one sticks out further.
 * With `archerId`, the tabs of a coach in that archer's journal (coach/[archerId]/layout.tsx).
 */
export function BinderTabs({ archerId }: { archerId?: string }) {
  const t = useTranslations();
  const pathname = usePathname();
  const sections = archerId ? coachSections(archerId) : ARCHER_SECTIONS;
  const current = sectionOf(pathname, sections);

  return (
    <nav className={classes.tabs} aria-label={t('nav.archerSection')}>
      {sections.map((section) => {
        const { key, href, icon: Icon } = section;
        const active = current?.href === href;
        return (
          <Link
            key={href}
            href={href}
            className={classes.tab}
            data-active={active || undefined}
            aria-current={active ? 'page' : undefined}
            style={tabColors(section)}
          >
            <Icon size={18} stroke={active ? 2.2 : 1.8} />
            <span className={classes.label}>{t(`archer.${key}`)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
