import request from 'supertest';
import { createTestApp, fakeIdToken, type TestContext } from './helpers.js';

describe('Journal (e2e)', () => {
  let ctx: TestContext;
  let archer: string;
  let otherArcher: string;
  let coach: string;
  /** Season 2026-2027 journals. */
  let journalId: string;
  let otherJournalId: string;

  const http = () => request(ctx.app.getHttpServer());
  const as = (token: string) => ({ Authorization: `Bearer ${token}` });
  const signUp = async (sub: string, roles: string[]) =>
    (
      await http()
        .post('/api/v1/auth/google')
        .send({ idToken: fakeIdToken(sub, `${sub}@gmail.com`), roles })
        .expect(200)
    ).body.accessToken as string;
  const createJournal = async (token: string, title = 'Saison 2026-2027') =>
    (
      await http()
        .post('/api/v1/journals')
        .set(as(token))
        .send({ title, startDate: '2026-09-01', endDate: '2027-08-31' })
        .expect(201)
    ).body.id as string;

  beforeAll(async () => {
    ctx = await createTestApp();
    archer = await signUp('j-archer', ['ARCHER']);
    otherArcher = await signUp('j-other', ['ARCHER']);
    coach = await signUp('j-coach', ['COACH']);
    journalId = await createJournal(archer);
    otherJournalId = await createJournal(otherArcher);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('creates, fills, lists, reads and deletes a session', async () => {
    const created = await http()
      .post('/api/v1/journal/sessions')
      .set(as(archer))
      .send({ journalId, type: 'TRAINING', date: '2026-10-05', startTime: '18:30' })
      .expect(201);
    const id = created.body.id as string;
    expect(created.body).toMatchObject({
      journalId,
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
      .get(`/api/v1/journal/sessions?journalId=${journalId}&from=2026-10-01&to=2026-10-31`)
      .set(as(archer))
      .expect(200);
    expect(october.body).toEqual([expect.objectContaining({ id, date: '2026-10-05' })]);
    const november = await http()
      .get(`/api/v1/journal/sessions?journalId=${journalId}&from=2026-11-01&to=2026-11-30`)
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
      .send({ journalId, type: 'COMPETITION', date: '2026-10-10' })
      .expect(201);

    await http().get(`/api/v1/journal/sessions/${body.id}`).set(as(otherArcher)).expect(404);
    await http()
      .patch(`/api/v1/journal/sessions/${body.id}`)
      .set(as(otherArcher))
      .send({ score: 1 })
      .expect(404);
    await http().delete(`/api/v1/journal/sessions/${body.id}`).set(as(otherArcher)).expect(404);
    const list = await http()
      .get(`/api/v1/journal/sessions?journalId=${otherJournalId}&from=2026-10-01&to=2026-10-31`)
      .set(as(otherArcher))
      .expect(200);
    expect(list.body).toEqual([]);
    // Someone else's journal can't be read, filled or deleted.
    await http()
      .get(`/api/v1/journal/sessions?journalId=${journalId}&from=2026-10-01&to=2026-10-31`)
      .set(as(otherArcher))
      .expect(404);
    await http()
      .post('/api/v1/journal/sessions')
      .set(as(otherArcher))
      .send({ journalId, type: 'TRAINING', date: '2026-10-10' })
      .expect(404);
    await http().delete(`/api/v1/journals/${journalId}`).set(as(otherArcher)).expect(404);
  });

  it('is reserved to archers and validates input', async () => {
    const october = `/api/v1/journal/sessions?journalId=${journalId}&from=2026-10-01&to=2026-10-31`;
    await http().get(october).set(as(coach)).expect(403);
    await http().get(october).expect(401);
    await http().get('/api/v1/journals').set(as(coach)).expect(403);

    const bad = await http()
      .post('/api/v1/journal/sessions')
      .set(as(archer))
      .send({ journalId, type: 'YOGA', date: '05/10/2026', startTime: '25:00' })
      .expect(400);
    expect(bad.body.errors.map((e: { field: string }) => e.field).sort()).toEqual([
      'date',
      'startTime',
      'type',
    ]);

    const { body } = await http()
      .post('/api/v1/journal/sessions')
      .set(as(archer))
      .send({ journalId, type: 'STRENGTH', date: '2026-10-12' })
      .expect(201);
    await http()
      .patch(`/api/v1/journal/sessions/${body.id}`)
      .set(as(archer))
      .send({ satisfaction: 11, wentWell: ['a', 'b', 'c', 'd'] })
      .expect(400);

    await http()
      .get(`/api/v1/journal/sessions?journalId=${journalId}&from=2026-01-01&to=2027-06-01`)
      .set(as(archer))
      .expect(400);
  });

  it('creates, lists and deletes journals with their sessions', async () => {
    const token = await signUp('j-seasons', ['ARCHER']);
    expect((await http().get('/api/v1/journals').set(as(token)).expect(200)).body).toEqual([]);

    const previous = await http()
      .post('/api/v1/journals')
      .set(as(token))
      .send({ title: '  Saison 2025-2026 ', startDate: '2025-09-01', endDate: '2026-08-31' })
      .expect(201);
    expect(previous.body).toMatchObject({
      title: 'Saison 2025-2026',
      startDate: '2025-09-01',
      endDate: '2026-08-31',
      sessionCount: 0,
    });
    const current = await createJournal(token);

    const addSession = (date: string) =>
      http()
        .post('/api/v1/journal/sessions')
        .set(as(token))
        .send({ journalId: current, type: 'TRAINING', date });
    const session = await addSession('2026-09-01').expect(201);
    await addSession('2027-08-31').expect(201);

    // Sessions stay within their journal's period.
    const outside = await addSession('2027-09-01').expect(400);
    expect(outside.body.code).toBe('SESSION_OUTSIDE_JOURNAL');
    const moved = await http()
      .patch(`/api/v1/journal/sessions/${session.body.id}`)
      .set(as(token))
      .send({ date: '2026-08-31' })
      .expect(400);
    expect(moved.body.code).toBe('SESSION_OUTSIDE_JOURNAL');

    // Renaming and moving the period, as long as it still covers the sessions.
    const patch = (body: object) =>
      http().patch(`/api/v1/journals/${current}`).set(as(token)).send(body);
    const renamed = await patch({ title: ' Extérieur 2027 ', startDate: '2026-08-15' }).expect(200);
    expect(renamed.body).toMatchObject({
      title: 'Extérieur 2027',
      startDate: '2026-08-15',
      endDate: '2027-08-31',
      sessionCount: 2,
    });
    const shrunk = await patch({ endDate: '2027-06-30' }).expect(409);
    expect(shrunk.body.code).toBe('JOURNAL_PERIOD_EXCLUDES_SESSIONS');
    await patch({ startDate: '2027-09-01' }).expect(400);
    await patch({ title: ' ' }).expect(400);
    await http()
      .patch(`/api/v1/journals/${current}`)
      .set(as(otherArcher))
      .send({ title: 'Volé' })
      .expect(404);

    // Calendar decoration, month by month: an opaque theme id, removed with null.
    const setTheme = (month: string, theme: string | null) =>
      http()
        .put(`/api/v1/journals/${current}/months/${month}/theme`)
        .set(as(token))
        .send({ theme });
    await setTheme('2026-12', 'snow').expect(200);
    const themed = await setTheme('2026-10', 'archery').expect(200);
    expect(themed.body.monthThemes).toEqual([
      { month: '2026-10', theme: 'archery', fills: [] },
      { month: '2026-12', theme: 'snow', fills: [] },
    ]);
    expect((await setTheme('2026-12', null).expect(200)).body.monthThemes).toEqual([
      { month: '2026-10', theme: 'archery', fills: [] },
    ]);

    // Colouring: "paint bucket" clicks, kept month by month with the decoration.
    const color = (month: string, fills: object[]) =>
      http()
        .put(`/api/v1/journals/${current}/months/${month}/coloring`)
        .set(as(token))
        .send({ fills });
    const fills = [
      { band: 'top', x: 0.15, y: 0.4, color: '#e03131' },
      { band: 'left', x: 0.5, y: 0.25, color: '#1c7ed6' },
    ];
    expect((await color('2026-10', fills).expect(200)).body.monthThemes).toEqual([
      { month: '2026-10', theme: 'archery', fills },
    ]);
    const noTheme = await color('2026-11', fills).expect(409);
    expect(noTheme.body.code).toBe('MONTH_HAS_NO_THEME');
    await color('2026-10', [{ band: 'middle', x: 2, y: -1, color: 'red' }]).expect(400);
    await color('2025-01', fills).expect(400);
    // Choosing the same decoration again keeps the colouring; another one starts blank.
    expect((await setTheme('2026-10', 'archery').expect(200)).body.monthThemes[0].fills).toEqual(
      fills,
    );
    expect((await setTheme('2026-10', 'snow').expect(200)).body.monthThemes[0].fills).toEqual([]);
    await http()
      .put(`/api/v1/journals/${current}/months/2026-10/coloring`)
      .set(as(otherArcher))
      .send({ fills })
      .expect(404);
    await setTheme('2026-10', '../etc').expect(400);
    await setTheme('2025-01', 'archery').expect(400); // outside the journal's period
    await setTheme('octobre', 'archery').expect(400);
    await http()
      .put(`/api/v1/journals/${current}/months/2026-10/theme`)
      .set(as(otherArcher))
      .send({ theme: 'archery' })
      .expect(404);

    // Most recent season first.
    const list = await http().get('/api/v1/journals').set(as(token)).expect(200);
    expect(list.body).toEqual([
      expect.objectContaining({ id: current, sessionCount: 2 }),
      expect.objectContaining({ id: previous.body.id, sessionCount: 0 }),
    ]);

    await http()
      .post('/api/v1/journals')
      .set(as(token))
      .send({ title: 'À l’envers', startDate: '2026-09-01', endDate: '2026-08-31' })
      .expect(400);
    const bad = await http()
      .post('/api/v1/journals')
      .set(as(token))
      .send({ title: '   ', startDate: '2026-9-1', endDate: 'demain' })
      .expect(400);
    expect(bad.body.errors.map((e: { field: string }) => e.field).sort()).toEqual([
      'endDate',
      'startDate',
      'title',
    ]);

    await http().delete(`/api/v1/journals/${current}`).set(as(token)).expect(204);
    await http().get(`/api/v1/journal/sessions/${session.body.id}`).set(as(token)).expect(404);
    await http().delete(`/api/v1/journals/${current}`).set(as(token)).expect(404);
    expect((await http().get('/api/v1/journals').set(as(token)).expect(200)).body).toHaveLength(1);
  });

  it('records other events with a title, a colour, a pictogram and a free text', async () => {
    const created = await http()
      .post('/api/v1/journal/sessions')
      .set(as(archer))
      .send({ journalId, type: 'OTHER', date: '2026-12-05', startTime: '10:00' })
      .expect(201);
    expect(created.body).toMatchObject({ type: 'OTHER', startTime: '10:00', description: null });
    await http()
      .patch(`/api/v1/journal/sessions/${created.body.id}`)
      .set(as(archer))
      .send({ description: 'Réglage du viseur', title: ' Atelier ', color: 'violet', icon: 'TOOL' })
      .expect(200);
    await http()
      .patch(`/api/v1/journal/sessions/${created.body.id}`)
      .set(as(archer))
      .send({ color: '#ff0000', icon: 'SKULL' })
      .expect(400);

    const december = await http()
      .get(`/api/v1/journal/sessions?journalId=${journalId}&from=2026-12-01&to=2026-12-31`)
      .set(as(archer))
      .expect(200);
    expect(december.body).toEqual([
      expect.objectContaining({
        id: created.body.id,
        description: 'Réglage du viseur',
        title: 'Atelier',
        color: 'violet',
        icon: 'TOOL',
      }),
    ]);
  });

  it('suggests previously entered values, most frequent first', async () => {
    const add = async (date: string, data: object) => {
      const { body } = await http()
        .post('/api/v1/journal/sessions')
        .set(as(otherArcher))
        .send({ journalId: otherJournalId, type: 'TRAINING', date })
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
