/** Bands of artwork placed around the calendar. Only `top` shows on phones. */
export type ThemeBand = 'top' | 'bottom' | 'left' | 'right';

/**
 * Decoration themes of a journal's calendar. A journal stores the id; the
 * artwork lives in `public/themes/<id>/<band>.<ext>`, plus `thumb.<ext>` for
 * the picker. Line art: pure black strokes on white, closed shapes.
 */
export const THEMES = {
  archery: { ext: 'svg', bands: ['top', 'bottom', 'left', 'right'] },
  rentree: { ext: 'svg', bands: ['top', 'bottom', 'left', 'right'] },
  nouvelan: { ext: 'svg', bands: ['top', 'bottom', 'left', 'right'] },
  valentin: { ext: 'svg', bands: ['top', 'bottom', 'left', 'right'] },
  espace: { ext: 'svg', bands: ['top', 'bottom', 'left', 'right'] },
  printemps: { ext: 'svg', bands: ['top', 'bottom', 'left', 'right'] },
  cerisier: { ext: 'svg', bands: ['top', 'bottom', 'left', 'right'] },
  fruits: { ext: 'svg', bands: ['top', 'bottom', 'left', 'right'] },
  ete: { ext: 'svg', bands: ['top', 'bottom', 'left', 'right'] },
  halloween: { ext: 'svg', bands: ['top', 'bottom', 'left', 'right'] },
  automne: { ext: 'svg', bands: ['top', 'bottom', 'left', 'right'] },
  noel: { ext: 'svg', bands: ['top', 'bottom', 'left', 'right'] },
  hiver: { ext: 'svg', bands: ['top', 'bottom', 'left', 'right'] },
} as const satisfies Record<string, { ext: string; bands: readonly ThemeBand[] }>;

export type ThemeId = keyof typeof THEMES;
export const THEME_IDS = Object.keys(THEMES) as ThemeId[];

/** Null for "no decoration" and for ids this client no longer ships. */
export function findTheme(id: string | null | undefined): ThemeId | null {
  return id && id in THEMES ? (id as ThemeId) : null;
}

export function themeImage(id: ThemeId, image: ThemeBand | 'thumb'): string {
  return `/themes/${id}/${image}.${THEMES[id].ext}`;
}
