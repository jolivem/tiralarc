import request from 'supertest';
import { createTestApp, fakeIdToken, type TestContext } from './helpers.js';

describe('Journal (e2e)', () => {
  let ctx: TestContext;
  let archer: string;
  let otherArcher: string;
  let coach: string;
  /** The archer's season 2026-2027 journal. */
  let journalId: string;

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
      .get(`/api/v1/journal/sessions?from=2026-10-01&to=2026-10-31`)
      .set(as(archer))
      .expect(200);
    expect(october.body).toEqual([expect.objectContaining({ id, date: '2026-10-05' })]);
    const november = await http()
      .get(`/api/v1/journal/sessions?from=2026-11-01&to=2026-11-30`)
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
      .get(`/api/v1/journal/sessions?from=2026-10-01&to=2026-10-31`)
      .set(as(otherArcher))
      .expect(200);
    expect(list.body).toEqual([]);
    // Someone else's journal can't be changed or deleted.
    await http()
      .patch(`/api/v1/journals/${journalId}`)
      .set(as(otherArcher))
      .send({ title: 'Volé' })
      .expect(404);
    await http().delete(`/api/v1/journals/${journalId}`).set(as(otherArcher)).expect(404);
  });

  it('is reserved to archers and validates input', async () => {
    const october = `/api/v1/journal/sessions?from=2026-10-01&to=2026-10-31`;
    await http().get(october).set(as(coach)).expect(403);
    await http().get(october).expect(401);
    await http().get('/api/v1/journals').set(as(coach)).expect(403);

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
      .get(`/api/v1/journal/sessions?from=2026-01-01&to=2027-06-01`)
      .set(as(archer))
      .expect(400);
  });

  it('treats a journal as a period: its events are those dated within it', async () => {
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
      http().post('/api/v1/journal/sessions').set(as(token)).send({ type: 'TRAINING', date });
    const session = await addSession('2026-09-01').expect(201);
    await addSession('2027-08-31').expect(201);
    // An event is free of any journal: this one is after the period, so in neither journal.
    await addSession('2027-09-01').expect(201);

    const patch = (body: object) =>
      http().patch(`/api/v1/journals/${current}`).set(as(token)).send(body);
    const renamed = await patch({ title: ' Extérieur 2027 ' }).expect(200);
    expect(renamed.body).toMatchObject({
      title: 'Extérieur 2027',
      startDate: '2026-09-01',
      endDate: '2027-08-31',
      sessionCount: 2,
    });

    // A journal's events are those dated within its period: they follow its dates.
    expect((await patch({ endDate: '2027-06-30' }).expect(200)).body.sessionCount).toBe(1);
    expect((await patch({ endDate: '2027-09-30' }).expect(200)).body.sessionCount).toBe(3);
    expect((await patch({ endDate: '2027-08-31' }).expect(200)).body.sessionCount).toBe(2);
    await http()
      .patch(`/api/v1/journal/sessions/${session.body.id}`)
      .set(as(token))
      .send({ date: '2026-08-31' }) // moved into the previous season
      .expect(200);
    const afterMove = await http().get('/api/v1/journals').set(as(token)).expect(200);
    expect(afterMove.body.map((j: { sessionCount: number }) => j.sessionCount)).toEqual([1, 1]);
    await http()
      .patch(`/api/v1/journal/sessions/${session.body.id}`)
      .set(as(token))
      .send({ date: '2026-09-01' })
      .expect(200);

    // An archer's journals never share a day; they may follow one another.
    const overlapping = await patch({ startDate: '2026-08-31' }).expect(409);
    expect(overlapping.body.code).toBe('JOURNAL_OVERLAP');
    const duplicate = await http()
      .post('/api/v1/journals')
      .set(as(token))
      .send({ title: 'Doublon', startDate: '2027-01-01', endDate: '2027-01-31' })
      .expect(409);
    expect(duplicate.body.code).toBe('JOURNAL_OVERLAP');
    // Someone else's journals don't count.
    const someoneElse = await signUp('j-seasons-2', ['ARCHER']);
    await http()
      .post('/api/v1/journals')
      .set(as(someoneElse))
      .send({ title: 'Saison', startDate: '2026-09-01', endDate: '2027-08-31' })
      .expect(201);

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

    // Deleting a journal keeps the events of its period: a new journal shows them again.
    await http().delete(`/api/v1/journals/${current}`).set(as(token)).expect(204);
    await http().get(`/api/v1/journal/sessions/${session.body.id}`).set(as(token)).expect(200);
    const recreated = await http()
      .post('/api/v1/journals')
      .set(as(token))
      .send({ title: 'Revenu', startDate: '2026-09-01', endDate: '2027-08-31' })
      .expect(201);
    expect(recreated.body.sessionCount).toBe(2);
    await http().delete(`/api/v1/journals/${recreated.body.id}`).set(as(token)).expect(204);
    await http().delete(`/api/v1/journals/${current}`).set(as(token)).expect(404);
    expect((await http().get('/api/v1/journals').set(as(token)).expect(200)).body).toHaveLength(1);
  });

  it('records other events with a title, a colour, a pictogram and a free text', async () => {
    const created = await http()
      .post('/api/v1/journal/sessions')
      .set(as(archer))
      .send({ type: 'OTHER', date: '2026-12-05', startTime: '10:00' })
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
      .get(`/api/v1/journal/sessions?from=2026-12-01&to=2026-12-31`)
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

  it('summarises a period, or all time, for the indicators', async () => {
    const token = await signUp('j-stats', ['ARCHER']);
    const add = async (type: string, date: string, data: object) => {
      const { body } = await http()
        .post('/api/v1/journal/sessions')
        .set(as(token))
        .send({ type, date })
        .expect(201);
      await http()
        .patch(`/api/v1/journal/sessions/${body.id}`)
        .set(as(token))
        .send(data)
        .expect(200);
      return body.id as string;
    };
    const second = await add('COMPETITION', '2026-11-07', {
      discipline: 'INDOOR',
      arrowCount: 60,
      score: 540,
      location: 'Gymnase',
    });
    const first = await add('COMPETITION', '2026-10-03', { discipline: 'INDOOR' });
    await add('TRAINING', '2026-11-07', { arrowCount: 90, score: 800 });
    await add('TRAINING', '2026-10-14', { arrowCount: 120 });
    await add('COACHING', '2026-10-20', {}); // no arrows recorded: not a data point
    // After the period asked for below.
    await add('COMPETITION', '2027-10-10', { arrowCount: 72, score: 600 });

    const { body } = await http()
      .get('/api/v1/journal/sessions/stats?from=2026-09-01&to=2027-08-31')
      .set(as(token))
      .expect(200);
    expect(body).toEqual({
      competitions: [
        {
          id: first,
          date: '2026-10-03',
          discipline: 'INDOOR',
          arrowCount: null,
          score: null,
          location: null,
        },
        {
          id: second,
          date: '2026-11-07',
          discipline: 'INDOOR',
          arrowCount: 60,
          score: 540,
          location: 'Gymnase',
        },
      ],
      arrowsByDay: [
        { date: '2026-10-14', arrows: 120 },
        { date: '2026-11-07', arrows: 150 },
      ],
    });
    // Without bounds: every event the archer recorded.
    const allTime = await http().get('/api/v1/journal/sessions/stats').set(as(token)).expect(200);
    expect(allTime.body.competitions).toHaveLength(3);
    expect(allTime.body.arrowsByDay.at(-1)).toEqual({ date: '2027-10-10', arrows: 72 });
    const since = await http()
      .get('/api/v1/journal/sessions/stats?from=2026-11-01')
      .set(as(token))
      .expect(200);
    expect(since.body.competitions.map((c: { date: string }) => c.date)).toEqual([
      '2026-11-07',
      '2027-10-10',
    ]);
    // Archers only.
    const other = await http().get('/api/v1/journal/sessions/stats').set(as(coach)).expect(403);
    expect(other.body.code).toBe('FORBIDDEN');
    await http().get('/api/v1/journal/sessions/stats?from=hier').set(as(token)).expect(400);
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
