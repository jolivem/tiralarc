import request from 'supertest';
import { createTestApp, type TestContext } from './helpers.js';

describe('The example journal (e2e)', () => {
  let ctx: TestContext;
  const http = () => request(ctx.app.getHttpServer());

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('signs a visitor into a made-up season, read-only', async () => {
    const { accessToken } = (
      await http().post('/api/v1/auth/demo').send({ locale: 'fr' }).expect(200)
    ).body;
    const as = { Authorization: `Bearer ${accessToken}` };

    const me = (await http().get('/api/v1/users/me').set(as).expect(200)).body;
    expect(me).toMatchObject({ isDemo: true, roles: ['ARCHER'] });
    const [journal] = (await http().get('/api/v1/journals').set(as).expect(200)).body;
    expect(journal.title).toMatch(/^Saison \d{4}-\d{4}$/);
    expect(journal.sessionCount).toBeGreaterThan(10);
    const goals = (await http().get('/api/v1/goals').set(as).expect(200)).body;
    expect(goals.length).toBe(4);

    const refused = await http()
      .post('/api/v1/journal/sessions')
      .set(as)
      .send({ type: 'TRAINING', date: new Date().toISOString().slice(0, 10) })
      .expect(403);
    expect(refused.body.code).toBe('DEMO_READ_ONLY');
    await http().delete('/api/v1/users/me').set(as).send({ email: me.email }).expect(403);

    // A second visitor gets the same season (made once a week).
    const count = await ctx.prisma.journalSession.count();
    await http().post('/api/v1/auth/demo').send({ locale: 'fr' }).expect(200);
    expect(await ctx.prisma.journalSession.count()).toBe(count);
    // In English, an account of its own.
    await http().post('/api/v1/auth/demo').send({ locale: 'en' }).expect(200);
    expect(await ctx.prisma.user.count({ where: { isDemo: true } })).toBe(2);
  });
});
