'use server';

import type { SheetTemplateInput } from '@tiralarc/api-client';
import { refresh } from 'next/cache';
import { type ActionState, send } from '@/lib/action-state';
import { getAuthedApi } from '@/lib/api';

/** Runs a change to the sheet templates (admins only), then shows the page anew. */
async function changeTemplates(
  call: (
    api: Awaited<ReturnType<typeof getAuthedApi>>,
  ) => Promise<{ data?: unknown; error?: unknown; response: Response }>,
): Promise<ActionState> {
  const result = await send(call(await getAuthedApi()));
  if (!result.ok) return result.state;
  refresh();
  return {};
}

/** A new template (no id), or changes to one. */
export async function saveSheetTemplate(
  id: string | null,
  values: SheetTemplateInput,
): Promise<ActionState> {
  return changeTemplates((api) =>
    id
      ? api.PATCH('/api/v1/admin/sheet-templates/{id}', { params: { path: { id } }, body: values })
      : api.POST('/api/v1/admin/sheet-templates', { body: values }),
  );
}

export async function setSheetTemplateHidden(id: string, hidden: boolean): Promise<ActionState> {
  return changeTemplates((api) =>
    api.PATCH('/api/v1/admin/sheet-templates/{id}', {
      params: { path: { id } },
      body: { hidden },
    }),
  );
}

export async function moveSheetTemplate(
  id: string,
  direction: 'UP' | 'DOWN',
): Promise<ActionState> {
  return changeTemplates((api) =>
    api.POST('/api/v1/admin/sheet-templates/{id}/move', {
      params: { path: { id } },
      body: { direction },
    }),
  );
}

export async function deleteSheetTemplate(id: string): Promise<ActionState> {
  return changeTemplates((api) =>
    api.DELETE('/api/v1/admin/sheet-templates/{id}', { params: { path: { id } } }),
  );
}
