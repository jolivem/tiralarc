import 'server-only';
import type { ArcherProfile } from '@tiralarc/api-client';
import { cache } from 'react';
import { getAuthedApi } from './api';

/**
 * The signed-in archer's profile, or null. Memoised per request (React `cache`), so the
 * root layout (calendar font) and the Profile page share a single GET /profile.
 */
export const getArcherProfile = cache(async (): Promise<ArcherProfile | null> => {
  try {
    const { data } = await (await getAuthedApi()).GET('/api/v1/profile');
    return data ?? null;
  } catch {
    return null;
  }
});
