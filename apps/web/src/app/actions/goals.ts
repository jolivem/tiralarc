'use server';

import type { GoalInput } from '@tiralarc/api-client';
import { refresh } from 'next/cache';
import { type ActionState, send } from '@/lib/action-state';
import { getAuthedApi } from '@/lib/api';

export async function createGoal(input: GoalInput): Promise<ActionState> {
  const result = await send((await getAuthedApi()).POST('/api/v1/goals', { body: input }));
  if (!result.ok) return result.state;
  refresh();
  return {};
}

/** Partial update; `achievedOn: null` marks the goal as not reached. */
export async function updateGoal(id: string, values: Partial<GoalInput>): Promise<ActionState> {
  const result = await send(
    (await getAuthedApi()).PATCH('/api/v1/goals/{id}', { params: { path: { id } }, body: values }),
  );
  if (!result.ok) return result.state;
  refresh();
  return {};
}

export async function deleteGoal(id: string): Promise<ActionState> {
  const result = await send(
    (await getAuthedApi()).DELETE('/api/v1/goals/{id}', { params: { path: { id } } }),
  );
  if (!result.ok) return result.state;
  refresh();
  return {};
}
