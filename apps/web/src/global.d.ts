import type { routing } from './i18n/routing';
import type messages from '../messages/fr.json';

// Type-safe translation keys and locales (next-intl).
declare module 'next-intl' {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof messages;
  }
}
