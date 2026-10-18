'use client';

import { ActionIcon } from '@mantine/core';
import { IconStar, IconStarFilled } from '@tabler/icons-react';
import type { Indicator } from '@tiralarc/api-client';
import { useTranslations } from 'next-intl';
import { createContext, type ReactNode, use, useState, useTransition } from 'react';
import { saveProfile } from '@/app/actions/profile';

const FavoriteContext = createContext<{
  favorite: Indicator | null;
  toggle: (indicator: Indicator) => void;
} | null>(null);

/**
 * The archer's favourite indicator (`favoriteIndicator` in the API's archer profile), shown
 * on the home page. A star toggles it at once; the profile is saved behind.
 */
export function FavoriteIndicatorProvider({
  initial,
  children,
}: {
  initial: Indicator | null;
  children: ReactNode;
}) {
  const [favorite, setFavorite] = useState(initial);
  const [, startSaving] = useTransition();
  const toggle = (indicator: Indicator) => {
    const next = favorite === indicator ? null : indicator;
    setFavorite(next);
    startSaving(async () => {
      const state = await saveProfile({ favoriteIndicator: next });
      // Not saved: the star goes back.
      if (state.code) setFavorite(favorite);
    });
  };
  return <FavoriteContext value={{ favorite, toggle }}>{children}</FavoriteContext>;
}

/** The star in a card's top right corner: empty, or filled yellow on the favourite. */
export function FavoriteStar({ indicator }: { indicator: Indicator }) {
  const t = useTranslations('stats.favorite');
  const context = use(FavoriteContext);
  if (!context) return null;
  const chosen = context.favorite === indicator;
  return (
    // Small enough to sit inside one square of the squared paper.
    <ActionIcon
      variant="subtle"
      color="yellow"
      size={20}
      onClick={() => context.toggle(indicator)}
      aria-pressed={chosen}
      aria-label={chosen ? t('remove') : t('add')}
      title={chosen ? t('remove') : t('add')}
    >
      {chosen ? (
        <IconStarFilled size={16} color="var(--mantine-color-yellow-5)" />
      ) : (
        <IconStar size={16} color="var(--mantine-color-yellow-6)" stroke={2} />
      )}
    </ActionIcon>
  );
}
