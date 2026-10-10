import createClient, { type ClientOptions } from 'openapi-fetch';
import type { components, paths } from './schema.js';

export type { components, paths };

/** Shorthand for a schema declared in the API's OpenAPI document. */
export type Schemas = components['schemas'];
export type User = Schemas['UserDto'];
export type TokenPair = Schemas['TokenPairDto'];
export type Role = Schemas['UserDto']['roles'][number];
export type SelfAssignableRole = Schemas['RegisterDto']['roles'][number];
export type Journal = Schemas['JournalDto'];
export type JournalCreate = Schemas['CreateJournalDto'];
export type JournalUpdate = Schemas['UpdateJournalDto'];
export type JournalSession = Schemas['SessionDto'];
export type JournalSessionSummary = Schemas['SessionSummaryDto'];
export type JournalSessionUpdate = Schemas['UpdateSessionDto'];
export type JournalSuggestions = Schemas['SessionSuggestionsDto'];
export type ArcherProfile = Schemas['ProfileDto'];
export type ArcherProfileUpdate = Schemas['UpdateProfileDto'];
export type AgeCategory = NonNullable<Schemas['ProfileDto']['category']>;
export type BowType = NonNullable<Schemas['ProfileDto']['bowType']>;
export type Invitation = Schemas['InvitationDto'];
export type InvitationCreate = Schemas['CreateInvitationDto'];
export type FavoriteSite = Schemas['SiteDto'];
export type FavoriteSiteCreate = Schemas['CreateSiteDto'];
export type EventColor = NonNullable<Schemas['SessionDto']['color']>;
export type EventIcon = NonNullable<Schemas['SessionDto']['icon']>;
export type Goal = Schemas['GoalDto'];
export type GoalType = Schemas['GoalDto']['type'];
export type GoalInput = Schemas['CreateGoalDto'];
export type JournalStats = Schemas['JournalStatsDto'];
export type CompetitionStat = Schemas['CompetitionStatDto'];
export type ThemeFill = Schemas['FillDto'];
export type SessionPhoto = Schemas['PhotoDto'];
export type SessionType = Schemas['SessionDto']['type'];
export type Discipline = NonNullable<Schemas['SessionDto']['discipline']>;
export type Feeling = NonNullable<Schemas['SessionDto']['physicalFeeling']>;

/**
 * Stable error codes (apps/api/src/common/errors.ts). Clients translate these;
 * `detail` is English, for developers.
 */
export type ErrorCode =
  | 'VALIDATION_FAILED'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'TOO_MANY_REQUESTS'
  | 'INTERNAL_ERROR'
  | 'EMAIL_TAKEN'
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_NOT_VERIFIED'
  | 'INVALID_VERIFICATION_TOKEN'
  | 'INVALID_REFRESH_TOKEN'
  | 'INVALID_ID_TOKEN'
  | 'PROVIDER_NOT_CONFIGURED'
  | 'JOURNAL_OVERLAP'
  | 'INVITATION_ALREADY_SENT'
  | 'INVALID_INVITATION_TOKEN'
  | 'CANNOT_INVITE_SELF'
  | 'LIMIT_REACHED'
  | 'INVALID_IMAGE'
  | 'MONTH_HAS_NO_THEME'
  | 'FILE_TOO_LARGE';

/** RFC 9457 error body returned by every failing API call. */
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  code: ErrorCode;
  detail?: string;
  instance: string;
  /** Present when code is VALIDATION_FAILED. `constraints` are rule names, e.g. "isEmail". */
  errors?: { field: string; constraints: string[]; messages: string[] }[];
}

/**
 * Typed client for the Tiralarc API. `baseUrl` is the API origin
 * (e.g. http://localhost:3001); paths already include /api/v1.
 */
export function createApiClient(options: ClientOptions & { baseUrl: string }) {
  return createClient<paths>(options);
}

export type ApiClient = ReturnType<typeof createApiClient>;
