'use server';

import type {
  ArcherProfileUpdate,
  CoachAccess,
  FavoriteSiteCreate,
  InvitationCreate,
} from '@tiralarc/api-client';
import { refresh } from 'next/cache';
import { getLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { type ActionState, send } from '@/lib/action-state';
import { clientHeaders, getAuthedApi } from '@/lib/api';
import { getCurrentUser } from '@/lib/current-user';

type AuthedApi = Awaited<ReturnType<typeof getAuthedApi>>;

/** Runs a profile mutation, then re-renders the page with the new lists. */
async function mutate(
  call: (client: AuthedApi) => Promise<{ data?: unknown; error?: unknown; response: Response }>,
): Promise<ActionState> {
  const result = await send(call(await getAuthedApi()));
  if (!result.ok) return result.state;
  refresh();
  return {};
}

export async function saveProfile(values: ArcherProfileUpdate): Promise<ActionState> {
  const result = await send((await getAuthedApi()).PATCH('/api/v1/profile', { body: values }));
  if (!result.ok) return result.state;
  // The root layout sets the calendars' font from the profile.
  refresh();
  return { notice: 'saved' };
}

/** Adds a guest; the API emails them the invitation. */
export async function invitePerson(input: InvitationCreate): Promise<ActionState> {
  return mutate((client) => client.POST('/api/v1/profile/invitations', { body: input }));
}

/** What a coach may do in the journal of the season in progress. */
export async function setCoachAccess(id: string, coachAccess: CoachAccess): Promise<ActionState> {
  return mutate((client) =>
    client.PATCH('/api/v1/profile/invitations/{id}', {
      params: { path: { id } },
      body: { coachAccess },
    }),
  );
}

export async function removeInvitation(id: string): Promise<ActionState> {
  return mutate((client) =>
    client.DELETE('/api/v1/profile/invitations/{id}', { params: { path: { id } } }),
  );
}

export async function addSite(input: FavoriteSiteCreate): Promise<ActionState> {
  return mutate((client) => client.POST('/api/v1/profile/sites', { body: input }));
}

export async function removeSite(id: string): Promise<ActionState> {
  return mutate((client) =>
    client.DELETE('/api/v1/profile/sites/{id}', { params: { path: { id } } }),
  );
}

export type AcceptInvitationState = ActionState & {
  invitedBy?: string;
  /** A coach invitation accepted: the archer whose journal the user now follows. */
  archerId?: string | null;
};

/**
 * The guest's click on "Accept": the token is the proof. Sent with the user's session when
 * signed in — a coach invitation needs it (SIGN_IN_REQUIRED otherwise): that account
 * becomes the coach.
 */
export async function acceptInvitation(
  _prev: AcceptInvitationState,
  formData: FormData,
): Promise<AcceptInvitationState> {
  const result = await send(
    (await getAuthedApi()).POST('/api/v1/invitations/accept', {
      body: { token: String(formData.get('token')) },
      headers: await clientHeaders(),
    }),
  );
  if (!result.ok) return result.state;
  // A guest without an account: the site's home page tells them what it is for, with its FAQ
  // and the button to create their account.
  if (!result.data.archerId && !(await getCurrentUser())) {
    return redirect({
      href: { pathname: '/', query: { invitation: 'accepted' } },
      locale: await getLocale(),
    });
  }
  // The header's journal menu now lists the archer.
  if (result.data.archerId) refresh();
  return { invitedBy: result.data.invitedBy, archerId: result.data.archerId };
}
