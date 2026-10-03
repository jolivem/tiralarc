import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { createRemoteJWKSet, type JWTPayload, type JWTVerifyGetKey, jwtVerify } from 'jose';
import { ApiException, ErrorCode } from '../common/errors.js';
import type { Env } from '../config/env.js';
import { AuthProvider } from '../generated/prisma/client.js';

/** Identity extracted from a verified Google / Apple ID token. */
export interface ExternalIdentity {
  provider: AuthProvider;
  /** Stable account id at the provider (`sub`). */
  subject: string;
  email?: string;
  emailVerified: boolean;
  name?: string;
}

const PROVIDERS = {
  [AuthProvider.GOOGLE]: {
    jwks: createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs')),
    issuer: ['https://accounts.google.com', 'accounts.google.com'],
    audienceEnv: 'GOOGLE_CLIENT_IDS',
  },
  [AuthProvider.APPLE]: {
    jwks: createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys')),
    issuer: ['https://appleid.apple.com'],
    audienceEnv: 'APPLE_CLIENT_IDS',
  },
} as const;

/**
 * Verifies ID tokens issued to our web and mobile apps by Google and Apple:
 * signature (provider's public keys), issuer, audience (our client IDs) and expiry.
 * The same check serves every client, since native SDKs return the same tokens.
 */
@Injectable()
export class IdTokenVerifier {
  constructor(private readonly config: ConfigService<Env, true>) {}

  /** Provider's public signing keys (fetched and cached by jose). Overridden in tests. */
  protected keySet(provider: AuthProvider): JWTVerifyGetKey {
    return PROVIDERS[provider].jwks;
  }

  isEnabled(provider: AuthProvider): boolean {
    return this.config.get(PROVIDERS[provider].audienceEnv, { infer: true }).length > 0;
  }

  async verify(provider: AuthProvider, idToken: string, nonce?: string): Promise<ExternalIdentity> {
    const { issuer, audienceEnv } = PROVIDERS[provider];
    const audience = this.config.get(audienceEnv, { infer: true });
    if (audience.length === 0) {
      throw new ApiException(
        HttpStatus.NOT_IMPLEMENTED,
        ErrorCode.PROVIDER_NOT_CONFIGURED,
        `${provider} sign-in is not configured`,
      );
    }

    let payload: JWTPayload & Record<string, unknown>;
    try {
      ({ payload } = await jwtVerify(idToken, this.keySet(provider), {
        issuer: [...issuer],
        audience,
      }));
    } catch {
      throw new ApiException(
        HttpStatus.UNAUTHORIZED,
        ErrorCode.INVALID_ID_TOKEN,
        'Invalid ID token',
      );
    }

    if (nonce !== undefined && !nonceMatches(payload.nonce, nonce)) {
      throw new ApiException(HttpStatus.UNAUTHORIZED, ErrorCode.INVALID_ID_TOKEN, 'Nonce mismatch');
    }
    if (!payload.sub) {
      throw new ApiException(
        HttpStatus.UNAUTHORIZED,
        ErrorCode.INVALID_ID_TOKEN,
        'Missing subject',
      );
    }

    return {
      provider,
      subject: payload.sub,
      email: typeof payload.email === 'string' ? payload.email.toLowerCase() : undefined,
      // Apple sends "true"/"false" strings; Google sends booleans.
      emailVerified: payload.email_verified === true || payload.email_verified === 'true',
      name: typeof payload.name === 'string' ? payload.name : undefined,
    };
  }
}

/** Native Apple / Google SDKs put either the raw nonce or its SHA-256 in the token. */
function nonceMatches(claim: unknown, nonce: string): boolean {
  if (typeof claim !== 'string') return false;
  return claim === nonce || claim === createHash('sha256').update(nonce).digest('hex');
}
