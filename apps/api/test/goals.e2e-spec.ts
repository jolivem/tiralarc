import request from 'supertest';
import { createTestApp, fakeIdToken, type TestContext } from './helpers.js';

describe('Goals (e2e)', () => {
  let ctx: TestContext;
  let archer: string;
  let otherArcher: string;
  let coach: string;

  const http = () => request(ctx.app.getHttpServer());
  const as = (token: string) => ({ Authorization: `Bearer ${token}` });
  const signUp = async (sub: string, roles: string[]) =>
    (
      await http()
        .post('/api/v1/auth/google')
        .send({ idToken: fakeIdToken(sub, `${sub}@gmail.com`), roles })
        .expect(200)
    ).body.accessToken as string;

  beforeAll(async () => {
    ctx = await createTestApp();
    archer = await signUp('g-archer', ['ARCHER']);
    otherArcher = await signUp('g-other', ['ARCHER']);
    coach = await signUp('g-coach', ['COACH']);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('creates, lists, updates and deletes goals', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const first = await http()
      .post('/api/v1/goals')
      .set(as(archer))
      .send({ type: 'SPORT', description: '  Passer les 550 points en salle ' })
      .expect(201);
    expect(first.body).toEqual({
      id: first.body.id,
      type: 'SPORT',
      description: 'Passer les 550 points en salle',
      createdOn: today,
      achieved: false,
      achievedOn: null,
    });
    const older = await http()
      .post('/api/v1/goals')
      .set(as(archer))
      .send({ type: 'TECHNIQUE', description: 'Lâcher régulier', createdOn: '2026-09-01' })
      .expect(201);
    const reached = await http()
      .post('/api/v1/goals')
      .set(as(archer))
      .send({
        type: 'PHYSICAL',
        description: 'Gainage 3 fois par semaine',
        createdOn: '2026-09-01',
        achievedOn: '2026-10-01',
      })
      .expect(201);
    expect(reached.body).toMatchObject({ achieved: true, achievedOn: '2026-10-01' });

    // Goals still to reach first, then the reached ones.
    const list = await http().get('/api/v1/goals').set(as(archer)).expect(200);
    expect(list.body.map((g: { id: string }) => g.id)).toEqual([
      first.body.id,
      older.body.id,
      reached.body.id,
    ]);

    // Reaching a goal, editing it, then un-reaching it.
    const done = await http()
      .patch(`/api/v1/goals/${older.body.id}`)
      .set(as(archer))
      .send({ achievedOn: '2026-11-15', description: 'Lâcher régulier à 70 m', type: 'PERSONAL' })
      .expect(200);
    expect(done.body).toMatchObject({
      type: 'PERSONAL',
      description: 'Lâcher régulier à 70 m',
      createdOn: '2026-09-01',
      achieved: true,
      achievedOn: '2026-11-15',
    });
    const undone = await http()
      .patch(`/api/v1/goals/${older.body.id}`)
      .set(as(archer))
      .send({ achievedOn: null })
      .expect(200);
    expect(undone.body).toMatchObject({ achieved: false, achievedOn: null });

    const bad = await http()
      .post('/api/v1/goals')
      .set(as(archer))
      .send({ type: 'MENTAL', description: ' ', createdOn: 'hier', achievedOn: '2026-13-01' })
      .expect(400);
    expect(bad.body.errors.map((e: { field: string }) => e.field).sort()).toEqual([
      'achievedOn',
      'createdOn',
      'description',
      'type',
    ]);

    await http().delete(`/api/v1/goals/${first.body.id}`).set(as(archer)).expect(204);
    await http().delete(`/api/v1/goals/${first.body.id}`).set(as(archer)).expect(404);
    expect((await http().get('/api/v1/goals').set(as(archer)).expect(200)).body).toHaveLength(2);
  });

  it("keeps each archer's goals private, and is reserved to archers", async () => {
    const { body } = await http()
      .post('/api/v1/goals')
      .set(as(archer))
      .send({ type: 'SPORT', description: 'Podium départemental' })
      .expect(201);
    expect((await http().get('/api/v1/goals').set(as(otherArcher)).expect(200)).body).toEqual([]);
    await http()
      .patch(`/api/v1/goals/${body.id}`)
      .set(as(otherArcher))
      .send({ achievedOn: '2026-10-10' })
      .expect(404);
    await http().delete(`/api/v1/goals/${body.id}`).set(as(otherArcher)).expect(404);
    await http().get('/api/v1/goals').set(as(coach)).expect(403);
    await http().get('/api/v1/goals').expect(401);
  });
});
