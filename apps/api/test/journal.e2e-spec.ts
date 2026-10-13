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

  it('allows at most 4 events on one day', async () => {
    const add = (date: string) =>
      http().post('/api/v1/journal/sessions').set(as(otherArcher)).send({ type: 'OTHER', date });
    const ids: string[] = [];
    for (let i = 0; i < 4; i++) ids.push((await add('2027-03-15').expect(201)).body.id);
    const full = await add('2027-03-15').expect(409);
    expect(full.body.code).toBe('DAY_FULL');
    // Moving an event onto the full day is refused too; staying on it is fine.
    const other = (await add('2027-03-16').expect(201)).body.id as string;
    const move = (id: string, date: string) =>
      http().patch(`/api/v1/journal/sessions/${id}`).set(as(otherArcher)).send({ date });
    expect((await move(other, '2027-03-15').expect(409)).body.code).toBe('DAY_FULL');
    await move(ids[0]!, '2027-03-15').expect(200);
    // Another archer's day is their own.
    await http()
      .post('/api/v1/journal/sessions')
      .set(as(archer))
      .send({ type: 'OTHER', date: '2027-03-15' })
      .expect(201)
      .then(({ body }) =>
        http().delete(`/api/v1/journal/sessions/${body.id}`).set(as(archer)).expect(204),
      );
    for (const id of [...ids, other]) {
      await http().delete(`/api/v1/journal/sessions/${id}`).set(as(otherArcher)).expect(204);
    }
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
      completed: false,
    });

    // Planning fields alone don't complete the sheet; one review field does.
    const planned = await http()
      .patch(`/api/v1/journal/sessions/${id}`)
      .set(as(archer))
      .send({ location: 'Gymnase', objective: 'Tenue', distanceMeters: 18 })
      .expect(200);
    expect(planned.body).toMatchObject({ completed: false });
    const reviewed = await http()
      .patch(`/api/v1/journal/sessions/${id}`)
      .set(as(archer))
      .send({ toImprove: ['Lâcher'] })
      .expect(200);
    expect(reviewed.body).toMatchObject({ completed: true });

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

    // Nothing to review on a strength session: it is complete as it is.
    const strength = await http()
      .post('/api/v1/journal/sessions')
      .set(as(archer))
      .send({ type: 'STRENGTH', date: '2026-10-06' })
      .expect(201);
    expect(strength.body).toMatchObject({ completed: true });
    await http().delete(`/api/v1/journal/sessions/${strength.body.id}`).set(as(archer)).expect(204);
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
    const title = { band: 'title', x: 0.3, y: 0.5, color: '#ffd43b' };
    const fills = [
      { band: 'top', x: 0.15, y: 0.4, color: '#e03131' },
      { band: 'left', x: 0.5, y: 0.25, color: '#1c7ed6' },
      title,
    ];
    expect((await color('2026-10', fills).expect(200)).body.monthThemes).toEqual([
      { month: '2026-10', theme: 'archery', fills },
    ]);
    // Without decoration, only the month's name can be coloured.
    const noTheme = await color('2026-11', fills).expect(409);
    expect(noTheme.body.code).toBe('MONTH_HAS_NO_THEME');
    expect((await color('2026-11', [title]).expect(200)).body.monthThemes).toEqual([
      { month: '2026-10', theme: 'archery', fills },
      { month: '2026-11', theme: null, fills: [title] },
    ]);
    // A decoration chosen then removed keeps the name's colouring; uncoloured, the month goes.
    await setTheme('2026-11', 'snow').expect(200);
    expect((await setTheme('2026-11', null).expect(200)).body.monthThemes[1]).toEqual({
      month: '2026-11',
      theme: null,
      fills: [title],
    });
    expect((await color('2026-11', []).expect(200)).body.monthThemes).toHaveLength(1);
    await color('2026-10', [{ band: 'middle', x: 2, y: -1, color: 'red' }]).expect(400);
    await color('2025-01', fills).expect(400);
    // Choosing the same decoration again keeps the colouring; another one starts blank,
    // but for the month's name (drawn by the client, not part of the artwork).
    expect((await setTheme('2026-10', 'archery').expect(200)).body.monthThemes[0].fills).toEqual(
      fills,
    );
    expect((await setTheme('2026-10', 'snow').expect(200)).body.monthThemes[0].fills).toEqual([
      title,
    ]);
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

    // One default journal (opened at sign-in): choosing another moves it, false removes it.
    expect(previous.body.isDefault).toBe(false);
    expect((await patch({ isDefault: true }).expect(200)).body.isDefault).toBe(true);
    const defaults = async () =>
      (await http().get('/api/v1/journals').set(as(token)).expect(200)).body
        .filter((j: { isDefault: boolean }) => j.isDefault)
        .map((j: { id: string }) => j.id);
    expect(await defaults()).toEqual([current]);
    await http()
      .patch(`/api/v1/journals/${previous.body.id}`)
      .set(as(token))
      .send({ isDefault: true })
      .expect(200);
    expect(await defaults()).toEqual([previous.body.id]);
    // Editing the title only leaves the default alone.
    await patch({ title: 'Extérieur 2027' }).expect(200);
    expect(await defaults()).toEqual([previous.body.id]);
    await http()
      .patch(`/api/v1/journals/${previous.body.id}`)
      .set(as(token))
      .send({ isDefault: false })
      .expect(200);
    expect(await defaults()).toEqual([]);
    await patch({ isDefault: 'oui' }).expect(400);

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
