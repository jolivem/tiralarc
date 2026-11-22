'use server';

import type { Sheet, SheetCategory, StrengthStep } from '@tiralarc/api-client';
import { refresh } from 'next/cache';
import { getLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { type ActionState, send } from '@/lib/action-state';
import { getAuthedApi } from '@/lib/api';

/** "+" in one of the binder's parts (a title, maybe a template): the new sheet opens. */
export async function createSheet(input: {
  category: SheetCategory;
  title: string;
  templateId?: string;
  /** The site's language: that of the template's text. */
  locale?: string;
}): Promise<ActionState> {
  const result = await send((await getAuthedApi()).POST('/api/v1/sheets', { body: input }));
  if (!result.ok) return result.state;
  return redirect({ href: `/archer/sheets/${result.data.id}`, locale: await getLocale() });
}

export async function saveSheet(
  id: string,
  values: { title: string; body: string; strengthSteps?: StrengthStep[] },
): Promise<ActionState> {
  const result = await send(
    (await getAuthedApi()).PATCH('/api/v1/sheets/{id}', { params: { path: { id } }, body: values }),
  );
  return result.ok ? { notice: 'saved' } : result.state;
}

/** Attaches one photo (form field `file`) to a technique sheet; the API resizes and stores it. */
export async function uploadSheetPhoto(sheetId: string, form: FormData): Promise<ActionState> {
  const result = await send(
    (await getAuthedApi()).POST('/api/v1/sheets/{sheetId}/photos', {
      params: { path: { sheetId } },
      // Sent as multipart (fetch sets the boundary itself); the typed body is only a placeholder.
      body: { file: '' },
      bodySerializer: () => form,
    }),
  );
  if (!result.ok) return result.state;
  refresh();
  return {};
}

export async function deleteSheetPhoto(sheetId: string, id: string): Promise<ActionState> {
  const result = await send(
    (await getAuthedApi()).DELETE('/api/v1/sheets/{sheetId}/photos/{id}', {
      params: { path: { sheetId, id } },
    }),
  );
  if (!result.ok) return result.state;
  refresh();
  return {};
}

/** The archer's strength sheets (for a STRENGTH event to take one's programme). */
export async function strengthSheets(): Promise<Pick<Sheet, 'id' | 'title'>[]> {
  const result = await send((await getAuthedApi()).GET('/api/v1/sheets'));
  return result.ok
    ? result.data
        .filter((sheet) => sheet.category === 'STRENGTH')
        .map(({ id, title }) => ({ id, title }))
    : [];
}

/** A strength sheet's programme, to copy into a STRENGTH event (null when unreadable). */
export async function sheetProgramme(id: string): Promise<StrengthStep[] | null> {
  const result = await send(
    (await getAuthedApi()).GET('/api/v1/sheets/{id}', { params: { path: { id } } }),
  );
  return result.ok ? result.data.strengthSteps : null;
}

/** Then back to the binder. */
export async function deleteSheet(id: string): Promise<ActionState> {
  const result = await send(
    (await getAuthedApi()).DELETE('/api/v1/sheets/{id}', { params: { path: { id } } }),
  );
  if (!result.ok) return result.state;
  return redirect({ href: '/archer/sheets', locale: await getLocale() });
}
