import createClient, { type ClientOptions } from 'openapi-fetch';
import type { components, paths } from './schema.js';

export type { components, paths };

/** Shorthand for a schema declared in the API's OpenAPI document. */
export type Schemas = components['schemas'];
export type User = Schemas['UserDto'];
export type TokenPair = Schemas['TokenPairDto'];

/** RFC 9457 error body returned by every failing API call. */
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance: string;
  errors?: { field: string; messages: string[] }[];
}

/**
 * Typed client for the Tiralarc API. `baseUrl` is the API origin
 * (e.g. http://localhost:3001); paths already include /api/v1.
 */
export function createApiClient(options: ClientOptions & { baseUrl: string }) {
  return createClient<paths>(options);
}

export type ApiClient = ReturnType<typeof createApiClient>;
