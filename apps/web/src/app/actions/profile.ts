'use server';

import type {
  ArcherProfileUpdate,
  FavoriteSiteCreate,
  InvitationCreate,
} from '@tiralarc/api-client';
import { refresh } from 'next/cache';
import { type ActionState, send } from '@/lib/action-state';
import { api, clientHeaders, getAuthedApi } from '@/lib/api';

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
  return result.ok ? { notice: 'saved' } : result.state;
}

/** Adds a guest; the API emails them the invitation. */
export async function invitePerson(input: InvitationCreate): Promise<ActionState> {
  return mutate((client) => client.POST('/api/v1/profile/invitations', { body: input }));
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

export type AcceptInvitationState = ActionState & { invitedBy?: string };

/** The guest's click on "Accept" (no account needed: the token is the proof). */
export async function acceptInvitation(
  _prev: AcceptInvitationState,
  formData: FormData,
): Promise<AcceptInvitationState> {
  const result = await send(
    api.POST('/api/v1/invitations/accept', {
      body: { token: String(formData.get('token')) },
      headers: await clientHeaders(),
    }),
  );
  return result.ok ? { invitedBy: result.data.invitedBy } : result.state;
}
