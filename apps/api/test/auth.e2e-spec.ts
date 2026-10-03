import request from 'supertest';
import { createTestApp, type TestContext, verificationTokenFor } from './helpers.js';

describe('Auth — email + password (e2e)', () => {
  let ctx: TestContext;
  const credentials = { email: 'Jane@Example.com', password: 'correct horse battery' };

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  const http = () => request(ctx.app.getHttpServer());

  it('GET /api/v1/health is public', async () => {
    const res = await http().get('/api/v1/health').expect(200);
    expect(res.body.status).toBe('ok');
  });

  it('rejects invalid payloads with problem+json and stable codes', async () => {
    const res = await http()
      .post('/api/v1/auth/register')
      .send({ email: 'not-an-email', password: 'short', roles: ['ADMIN'] })
      .expect(400)
      .expect('Content-Type', /application\/problem\+json/);
    expect(res.body.code).toBe('VALIDATION_FAILED');
    expect(res.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'email', constraints: ['isEmail'] }),
        expect.objectContaining({ field: 'roles', constraints: ['isIn'] }),
      ]),
    );
  });

  it('register → login refused until verified → verify → me → refresh → logout', async () => {
    const registered = await http()
      .post('/api/v1/auth/register')
      .send({ ...credentials, displayName: 'Jane', roles: ['ARCHER', 'COACH'], locale: 'en' })
      .expect(201);
    expect(registered.body).toEqual({ email: 'jane@example.com', verificationRequired: true });

    // The email is in the user's language and links to the web app.
    const mail = ctx.outbox.at(-1)!;
    expect(mail.subject).toBe('Confirm your email address');
    expect(mail.text).toContain('http://localhost:3000/en/verify-email?token=');

    const dup = await http()
      .post('/api/v1/auth/register')
      .send({ ...credentials, roles: ['ARCHER'] });
    expect(dup.status).toBe(409);
    expect(dup.body.code).toBe('EMAIL_TAKEN');

    const unverified = await http().post('/api/v1/auth/login').send(credentials).expect(403);
    expect(unverified.body.code).toBe('EMAIL_NOT_VERIFIED');
    // Wrong password never reveals the verification state.
    const wrong = await http()
      .post('/api/v1/auth/login')
      .send({ ...credentials, password: 'wrong password' })
      .expect(401);
    expect(wrong.body.code).toBe('INVALID_CREDENTIALS');

    await http()
      .post('/api/v1/auth/resend-verification')
      .send({ email: credentials.email })
      .expect(202);
    const token = verificationTokenFor(ctx.outbox, 'jane@example.com');

    const verified = await http().post('/api/v1/auth/verify-email').send({ token }).expect(200);
    expect(verified.body.tokenType).toBe('Bearer');
    const reused = await http().post('/api/v1/auth/verify-email').send({ token }).expect(400);
    expect(reused.body.code).toBe('INVALID_VERIFICATION_TOKEN');

    const me = await http()
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${verified.body.accessToken}`)
      .expect(200);
    expect(me.body).toMatchObject({
      email: 'jane@example.com',
      displayName: 'Jane',
      emailVerified: true,
      locale: 'en',
      roles: ['ARCHER', 'COACH'],
      hasPassword: true,
      providers: [],
    });

    const login = await http().post('/api/v1/auth/login').send(credentials).expect(200);

    const refreshed = await http()
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: login.body.refreshToken })
      .expect(200);
    // Replaying the rotated token revokes the whole session…
    const replay = await http()
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: login.body.refreshToken })
      .expect(401);
    expect(replay.body.code).toBe('INVALID_REFRESH_TOKEN');
    await http()
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: refreshed.body.refreshToken })
      .expect(401);

    // …but not the other session (the one opened by email verification).
    await http()
      .post('/api/v1/auth/logout')
      .send({ refreshToken: verified.body.refreshToken })
      .expect(204);
    await http()
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: verified.body.refreshToken })
      .expect(401);
  });

  it('resend-verification does not reveal unknown addresses', async () => {
    const before = ctx.outbox.length;
    await http()
      .post('/api/v1/auth/resend-verification')
      .send({ email: 'nobody@example.com' })
      .expect(202);
    expect(ctx.outbox.length).toBe(before);
  });
});
