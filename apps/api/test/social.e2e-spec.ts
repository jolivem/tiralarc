import request from 'supertest';
import { createTestApp, fakeIdToken, type TestContext } from './helpers.js';

describe('Auth — Google / Apple (e2e)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  const http = () => request(ctx.app.getHttpServer());
  const me = (accessToken: string) =>
    http().get('/api/v1/users/me').set('Authorization', `Bearer ${accessToken}`).expect(200);

  it('signs up with Google, with roles chosen upfront', async () => {
    const res = await http()
      .post('/api/v1/auth/google')
      .send({ idToken: fakeIdToken('g-1', 'ann@gmail.com', true, 'Ann'), roles: ['COACH'] })
      .expect(200);
    const profile = await me(res.body.accessToken);
    expect(profile.body).toMatchObject({
      email: 'ann@gmail.com',
      displayName: 'Ann',
      emailVerified: true,
      roles: ['COACH'],
      hasPassword: false,
      providers: ['GOOGLE'],
    });

    // Signing in again finds the same account, roles in the request are ignored.
    const again = await http()
      .post('/api/v1/auth/google')
      .send({ idToken: fakeIdToken('g-1', 'ann@gmail.com'), roles: ['ARCHER'] })
      .expect(200);
    expect((await me(again.body.accessToken)).body).toMatchObject({
      id: profile.body.id,
      roles: ['COACH'],
    });
  });

  it('signs up with Apple without roles, then picks them', async () => {
    const res = await http()
      .post('/api/v1/auth/apple')
      .send({ idToken: fakeIdToken('a-1', 'x1@privaterelay.appleid.com'), displayName: 'Bob' })
      .expect(200);
    const token = res.body.accessToken as string;
    expect((await me(token)).body).toMatchObject({ roles: [], displayName: 'Bob' });

    const updated = await http()
      .put('/api/v1/users/me/roles')
      .set('Authorization', `Bearer ${token}`)
      .send({ roles: ['ARCHER'] })
      .expect(200);
    expect(updated.body.roles).toEqual(['ARCHER']);

    await http()
      .put('/api/v1/users/me/roles')
      .set('Authorization', `Bearer ${token}`)
      .send({ roles: ['ADMIN'] })
      .expect(400);
  });

  it('links to an existing verified account with the same email', async () => {
    await ctx.prisma.user.create({
      data: {
        email: 'carl@gmail.com',
        passwordHash: 'x',
        emailVerifiedAt: new Date(),
        roles: { create: [{ role: 'ARCHER' }] },
      },
    });
    const res = await http()
      .post('/api/v1/auth/google')
      .send({ idToken: fakeIdToken('g-carl', 'carl@gmail.com') })
      .expect(200);
    expect((await me(res.body.accessToken)).body).toMatchObject({
      roles: ['ARCHER'],
      hasPassword: true,
      providers: ['GOOGLE'],
    });
  });

  it('drops the password of an unverified account taken over by its real owner', async () => {
    await ctx.prisma.user.create({
      data: { email: 'dana@gmail.com', passwordHash: 'set-by-someone-else' },
    });
    const res = await http()
      .post('/api/v1/auth/google')
      .send({ idToken: fakeIdToken('g-dana', 'dana@gmail.com') })
      .expect(200);
    expect((await me(res.body.accessToken)).body).toMatchObject({
      emailVerified: true,
      hasPassword: false,
    });
  });

  it('rejects invalid tokens and unverified emails that collide', async () => {
    const invalid = await http()
      .post('/api/v1/auth/google')
      .send({ idToken: fakeIdToken('invalid', 'e@x.com') })
      .expect(401);
    expect(invalid.body.code).toBe('INVALID_ID_TOKEN');

    const collision = await http()
      .post('/api/v1/auth/google')
      .send({ idToken: fakeIdToken('g-other', 'ann@gmail.com', false) })
      .expect(409);
    expect(collision.body.code).toBe('EMAIL_TAKEN');
  });
});
