import { defineRouting } from 'next-intl/routing';

/** Every page lives under a locale prefix: /fr/..., /en/... */
export const routing = defineRouting({
  locales: ['fr', 'en'],
  defaultLocale: 'fr',
});

export type Locale = (typeof routing.locales)[number];
