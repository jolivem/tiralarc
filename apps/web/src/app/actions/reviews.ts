'use server';

import { type ActionState, send } from '@/lib/action-state';
import { api, getAuthedApi } from '@/lib/api';

/**
 * Rates the app and comments on it (one review a day): emailed for approval before it shows on
 * the home page. `nextAllowedAt` comes back on success.
 */
export async function submitReview(
  stars: number,
  comment: string,
): Promise<ActionState & { nextAllowedAt?: string | null }> {
  const result = await send(
    (await getAuthedApi()).POST('/api/v1/reviews', { body: { stars, comment } }),
  );
  if (!result.ok) return result.state;
  return { notice: 'sent', nextAllowedAt: result.data.nextAllowedAt };
}

/** The emailed moderation link: publishes or refuses the review (once). */
export async function moderateReview(
  token: string,
  decision: 'PUBLISH' | 'REFUSE',
): Promise<ActionState> {
  const result = await send(api.POST('/api/v1/reviews/moderation', { body: { token, decision } }));
  return result.ok ? { notice: decision === 'PUBLISH' ? 'published' : 'refused' } : result.state;
}
