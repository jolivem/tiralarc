import request from 'supertest';
import { createTestApp, fakeIdToken, type TestContext } from './helpers.js';

describe('Journal (e2e)', () => {
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
    archer = await signUp('j-archer', ['ARCHER']);
    otherArcher = await signUp('j-other', ['ARCHER']);
    coach = await signUp('j-coach', ['COACH']);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('creates, fills, lists, reads and deletes a session', async () => {
    const created = await http()
      .post('/api/v1/journal/sessions')
      .set(as(archer))
      .send({ type: 'TRAINING', date: '2026-10-05', startTime: '18:30' })
      .expect(201);
    const id = created.body.id as string;
    expect(created.body).toMatchObject({
      type: 'TRAINING',
      date: '2026-10-05',
      startTime: '18:30',
      wentWell: [],
      score: null,
    });

    const sheet = {
      location: '  Gymnase municipal ',
      discipline: 'INDOOR',
      distanceMeters: 18,
      durationMinutes: 90,
      arrowCount: 60,
      score: 552,
      objective: 'Travailler la tenue',
      satisfaction: 7,
      technique: 6,
      description: 'Bonne séance',
      physicalFeeling: 'GREAT',
      mentalFeeling: 'OK',
      wentWell: ['Ancrage stable', '', 'Respiration'],
      toImprove: ['Lâcher'],
      nextTime: 'Plus de volume',
    };
    const updated = await http()
      .patch(`/api/v1/journal/sessions/${id}`)
      .set(as(archer))
      .send(sheet)
      .expect(200);
    expect(updated.body).toMatchObject({
      ...sheet,
      location: 'Gymnase municipal',
      wentWell: ['Ancrage stable', 'Respiration'],
    });

    // null clears a field
    const cleared = await http()
      .patch(`/api/v1/journal/sessions/${id}`)
      .set(as(archer))
      .send({ startTime: null, score: null })
      .expect(200);
    expect(cleared.body).toMatchObject({ startTime: null, score: null, arrowCount: 60 });

    const october = await http()
      .get('/api/v1/journal/sessions?from=2026-10-01&to=2026-10-31')
      .set(as(archer))
      .expect(200);
    expect(october.body).toEqual([expect.objectContaining({ id, date: '2026-10-05' })]);
    const november = await http()
      .get('/api/v1/journal/sessions?from=2026-11-01&to=2026-11-30')
      .set(as(archer))
      .expect(200);
    expect(november.body).toEqual([]);

    await http().get(`/api/v1/journal/sessions/${id}`).set(as(archer)).expect(200);
    await http().delete(`/api/v1/journal/sessions/${id}`).set(as(archer)).expect(204);
    await http().get(`/api/v1/journal/sessions/${id}`).set(as(archer)).expect(404);
  });

  it("keeps each archer's journal private", async () => {
    const { body } = await http()
      .post('/api/v1/journal/sessions')
      .set(as(archer))
      .send({ type: 'COMPETITION', date: '2026-10-10' })
      .expect(201);

    await http().get(`/api/v1/journal/sessions/${body.id}`).set(as(otherArcher)).expect(404);
    await http()
      .patch(`/api/v1/journal/sessions/${body.id}`)
      .set(as(otherArcher))
      .send({ score: 1 })
      .expect(404);
    await http().delete(`/api/v1/journal/sessions/${body.id}`).set(as(otherArcher)).expect(404);
    const list = await http()
      .get('/api/v1/journal/sessions?from=2026-10-01&to=2026-10-31')
      .set(as(otherArcher))
      .expect(200);
    expect(list.body).toEqual([]);
  });

  it('is reserved to archers and validates input', async () => {
    await http()
      .get('/api/v1/journal/sessions?from=2026-10-01&to=2026-10-31')
      .set(as(coach))
      .expect(403);
    await http().get('/api/v1/journal/sessions?from=2026-10-01&to=2026-10-31').expect(401);

    const bad = await http()
      .post('/api/v1/journal/sessions')
      .set(as(archer))
      .send({ type: 'YOGA', date: '05/10/2026', startTime: '25:00' })
      .expect(400);
    expect(bad.body.errors.map((e: { field: string }) => e.field).sort()).toEqual([
      'date',
      'startTime',
      'type',
    ]);

    const { body } = await http()
      .post('/api/v1/journal/sessions')
      .set(as(archer))
      .send({ type: 'STRENGTH', date: '2026-10-12' })
      .expect(201);
    await http()
      .patch(`/api/v1/journal/sessions/${body.id}`)
      .set(as(archer))
      .send({ satisfaction: 11, wentWell: ['a', 'b', 'c', 'd'] })
      .expect(400);

    await http()
      .get('/api/v1/journal/sessions?from=2026-01-01&to=2027-06-01')
      .set(as(archer))
      .expect(400);
  });

  it('suggests previously entered values, most frequent first', async () => {
    const add = async (date: string, data: object) => {
      const { body } = await http()
        .post('/api/v1/journal/sessions')
        .set(as(otherArcher))
        .send({ type: 'TRAINING', date })
        .expect(201);
      await http()
        .patch(`/api/v1/journal/sessions/${body.id}`)
        .set(as(otherArcher))
        .send(data)
        .expect(200);
    };
    await add('2026-09-01', { location: 'Club', distanceMeters: 70, wentWell: ['Placement'] });
    await add('2026-09-08', {
      location: 'club',
      distanceMeters: 18,
      wentWell: ['Placement', 'Visée'],
    });
    await add('2026-09-15', { location: 'Gymnase', distanceMeters: 18, toImprove: ['Lâcher'] });

    const { body } = await http()
      .get('/api/v1/journal/sessions/suggestions')
      .set(as(otherArcher))
      .expect(200);
    expect(body).toEqual({
      locations: ['club', 'Gymnase'],
      distances: [18, 70],
      wentWell: ['Placement', 'Visée'],
      toImprove: ['Lâcher'],
    });
  });
});
