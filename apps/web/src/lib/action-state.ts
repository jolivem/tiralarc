import type { ErrorCode, ProblemDetails } from '@tiralarc/api-client';

/** Returned by Server Actions; client components translate the codes with next-intl. */
export interface ActionState {
  code?: ErrorCode | 'NETWORK_ERROR';
  /** Field name → failed validation rules (e.g. "isEmail"). */
  fieldErrors?: Record<string, string[]>;
  /** Success message key, e.g. "resent". */
  notice?: string;
}

type ApiResult<T> = { data?: T; error?: unknown; response: Response };

/**
 * Normalises an openapi-fetch call: `{ ok: true, data }` on 2xx, otherwise the
 * translated-ready ActionState (including NETWORK_ERROR when the API is down).
 */
export async function send<T>(
  call: Promise<ApiResult<T>>,
): Promise<{ ok: true; data: T } | { ok: false; state: ActionState }> {
  try {
    const { data, error, response } = await call;
    if (response.ok) return { ok: true, data: data as T };
    const problem = error as Partial<ProblemDetails> | undefined;
    return {
      ok: false,
      state: {
        code: problem?.code ?? 'INTERNAL_ERROR',
        fieldErrors: Object.fromEntries(
          (problem?.errors ?? []).map((e) => [e.field, e.constraints]),
        ),
      },
    };
  } catch {
    return { ok: false, state: { code: 'NETWORK_ERROR' } };
  }
}
