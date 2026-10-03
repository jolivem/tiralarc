import request from 'supertest';
import { createTestApp, fakeIdToken, type TestContext } from './helpers.js';

describe('Users & roles (e2e)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  const http = () => request(ctx.app.getHttpServer());

  it('restricts GET /users to admins', async () => {
    const archer = await http()
      .post('/api/v1/auth/google')
      .send({ idToken: fakeIdToken('u-1', 'archer@gmail.com'), roles: ['ARCHER'] })
      .expect(200);
    await http()
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${archer.body.accessToken}`)
      .expect(403);

    // Granted out of band (see `pnpm user:make-admin`), effective at the next token refresh.
    const user = await ctx.prisma.user.findUniqueOrThrow({ where: { email: 'archer@gmail.com' } });
    await ctx.prisma.userRole.create({ data: { userId: user.id, role: 'ADMIN' } });
    const refreshed = await http()
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: archer.body.refreshToken })
      .expect(200);

    const list = await http()
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${refreshed.body.accessToken}`)
      .expect(200);
    expect(list.body[0]).toMatchObject({ email: 'archer@gmail.com', roles: ['ADMIN', 'ARCHER'] });

    // Changing self-assignable roles keeps ADMIN.
    const updated = await http()
      .put('/api/v1/users/me/roles')
      .set('Authorization', `Bearer ${refreshed.body.accessToken}`)
      .send({ roles: ['COACH'] })
      .expect(200);
    expect(updated.body.roles).toEqual(['ADMIN', 'COACH']);
  });
});
