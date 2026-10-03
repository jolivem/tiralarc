import type { ConfigService } from '@nestjs/config';
import { createLocalJWKSet, exportJWK, generateKeyPair, type JWTVerifyGetKey, SignJWT } from 'jose';
import type { Env } from '../config/env.js';
import { AuthProvider } from '../generated/prisma/client.js';
import { IdTokenVerifier } from './id-token-verifier.service.js';

describe('IdTokenVerifier', () => {
  let sign: (
    claims: Record<string, unknown>,
    issuer?: string,
    audience?: string,
  ) => Promise<string>;
  let verifier: IdTokenVerifier;

  beforeAll(async () => {
    const { privateKey, publicKey } = await generateKeyPair('RS256');
    const jwks = createLocalJWKSet({
      keys: [{ ...(await exportJWK(publicKey)), kid: 'k1', alg: 'RS256' }],
    });

    sign = (claims, issuer = 'https://accounts.google.com', audience = 'web-client') =>
      new SignJWT(claims)
        .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
        .setIssuer(issuer)
        .setAudience(audience)
        .setSubject('sub-1')
        .setIssuedAt()
        .setExpirationTime('5m')
        .sign(privateKey);

    const config = {
      get: (key: keyof Env) =>
        ({ GOOGLE_CLIENT_IDS: ['web-client', 'ios-client'], APPLE_CLIENT_IDS: [] })[key as string],
    } as unknown as ConfigService<Env, true>;

    verifier = new (class extends IdTokenVerifier {
      protected override keySet(): JWTVerifyGetKey {
        return jwks;
      }
    })(config);
  });

  it('accepts a valid Google token and normalises claims', async () => {
    const token = await sign({ email: 'Ann@Gmail.com', email_verified: true, name: 'Ann' });
    await expect(verifier.verify(AuthProvider.GOOGLE, token)).resolves.toEqual({
      provider: AuthProvider.GOOGLE,
      subject: 'sub-1',
      email: 'ann@gmail.com',
      emailVerified: true,
      name: 'Ann',
    });
  });

  it('accepts any configured audience (web, iOS, Android clients)', async () => {
    const token = await sign({}, undefined, 'ios-client');
    await expect(verifier.verify(AuthProvider.GOOGLE, token)).resolves.toMatchObject({
      subject: 'sub-1',
    });
  });

  it.each([
    ['another app’s audience', () => sign({}, undefined, 'someone-else')],
    ['a foreign issuer', () => sign({}, 'https://evil.example')],
    ['a tampered token', async () => (await sign({})).slice(0, -4) + 'AAAA'],
  ])('rejects %s', async (_label, makeToken) => {
    await expect(verifier.verify(AuthProvider.GOOGLE, await makeToken())).rejects.toMatchObject({
      response: { code: 'INVALID_ID_TOKEN' },
    });
  });

  it('checks the nonce when given (raw or SHA-256)', async () => {
    const token = await sign({ nonce: 'n-123' });
    await expect(verifier.verify(AuthProvider.GOOGLE, token, 'n-123')).resolves.toBeDefined();
    await expect(verifier.verify(AuthProvider.GOOGLE, token, 'other')).rejects.toMatchObject({
      response: { code: 'INVALID_ID_TOKEN' },
    });
  });

  it('refuses a provider without configured client IDs', async () => {
    const token = await sign({}, 'https://appleid.apple.com');
    await expect(verifier.verify(AuthProvider.APPLE, token)).rejects.toMatchObject({
      response: { code: 'PROVIDER_NOT_CONFIGURED' },
    });
  });
});
