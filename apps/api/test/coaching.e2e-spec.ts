import request from 'supertest';
import { createTestApp, fakeIdToken, type TestContext } from './helpers.js';

/** A day `offset` days from today (YYYY-MM-DD, UTC like the API). */
const day = (offset: number) =>
  new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

describe('Coaching (e2e)', () => {
  let ctx: TestContext;
  let archer: string;
  let archerId: string;
  let coach: string;
  let otherCoach: string;
  let invitationId: string;
  let journalId: string;

  const http = () => request(ctx.app.getHttpServer());
  const as = (token: string) => ({ Authorization: `Bearer ${token}` });
  const signUp = async (sub: string, name: string) =>
    (
      await http()
        .post('/api/v1/auth/google')
        .send({ idToken: fakeIdToken(sub, `${sub}@gmail.com`, true, name) })
        .expect(200)
    ).body.accessToken as string;
  const base = () => `/api/v1/coach/athletes/${archerId}`;
  const setAccess = (coachAccess: 'READ' | 'WRITE') =>
    http()
      .patch(`/api/v1/profile/invitations/${invitationId}`)
      .set(as(archer))
      .send({ coachAccess })
      .expect(200);

  beforeAll(async () => {
    ctx = await createTestApp();
    archer = await signUp('c-archer', 'Léa Archère');
    // The coach may be an archer too: the invitation link grants the access, not the role.
    coach = await signUp('c-coach', 'Camille Coach');
    otherCoach = await signUp('c-other', 'Sam Autre');

    archerId = (await http().get('/api/v1/users/me').set(as(archer)).expect(200)).body.id;
    const invited = await http()
      .post('/api/v1/profile/invitations')
      .set(as(archer))
      .send({ name: 'Camille', email: 'camille@club.fr', isCoach: true })
      .expect(201);
    invitationId = invited.body.id;
    const mail = ctx.outbox.filter((m) => m.to === 'camille@club.fr').at(-1);
    const token = mail?.text.match(/invitations\/accept\?token=([\w-]+)/)?.[1];
    await http().post('/api/v1/invitations/accept').set(as(coach)).send({ token }).expect(200);

    // Last season, and the season in progress.
    await http()
      .post('/api/v1/journals')
      .set(as(archer))
      .send({ title: 'Saison passée', startDate: day(-400), endDate: day(-31) })
      .expect(201);
    journalId = (
      await http()
        .post('/api/v1/journals')
        .set(as(archer))
        .send({ title: 'Saison en cours', startDate: day(-30), endDate: day(200) })
        .expect(201)
    ).body.id;
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('lets a coach sort their archers into named groups', async () => {
    const groups = '/api/v1/coach/groups';
    const created = await http().post(groups).set(as(coach)).send({ name: ' Compétition ' });
    expect(created.status).toBe(201);
    expect(created.body).toEqual({ id: expect.any(String), name: 'Compétition' });
    const id = created.body.id as string;
    const other = await http().post(groups).set(as(coach)).send({ name: 'Loisir' }).expect(201);

    const same = await http().post(groups).set(as(coach)).send({ name: 'Loisir' }).expect(409);
    expect(same.body.code).toBe('GROUP_NAME_TAKEN');
    const taken = await http()
      .patch(`${groups}/${id}`)
      .set(as(coach))
      .send({ name: 'Loisir' })
      .expect(409);
    expect(taken.body.code).toBe('GROUP_NAME_TAKEN');
    await http().post(groups).set(as(coach)).send({ name: '   ' }).expect(400);
    await http().patch(`${groups}/${id}`).set(as(coach)).send({ name: 'Élite' }).expect(200);
    expect((await http().get(groups).set(as(coach)).expect(200)).body).toEqual([
      { id, name: 'Élite' },
      { id: other.body.id, name: 'Loisir' },
    ]);

    // Their own: another coach neither sees nor touches them.
    expect((await http().get(groups).set(as(otherCoach)).expect(200)).body).toEqual([]);
    await http().patch(`${groups}/${id}`).set(as(otherCoach)).send({ name: 'X' }).expect(404);
    await http().delete(`${groups}/${id}`).set(as(otherCoach)).expect(404);

    const put = (token: string, groupId: string | null) =>
      http().put(`${base()}/group`).set(as(token)).send({ groupId });
    await put(otherCoach, id).expect(404);
    await put(coach, '00000000-0000-4000-8000-000000000000').expect(404);
    expect((await put(coach, id).expect(200)).body.group).toEqual({ id, name: 'Élite' });
    expect((await http().get(base()).set(as(coach)).expect(200)).body.group.id).toBe(id);
    expect((await put(coach, null).expect(200)).body.group).toBeNull();

    // Deleting a group keeps the archer followed, in none.
    await put(coach, id).expect(200);
    await http().delete(`${groups}/${id}`).set(as(coach)).expect(204);
    expect((await http().get(base()).set(as(coach)).expect(200)).body.group).toBeNull();
    await http().delete(`${groups}/${other.body.id}`).set(as(coach)).expect(204);
  });

  it('makes the accepting account a coach of the archer', async () => {
    const me = await http().get('/api/v1/users/me').set(as(coach)).expect(200);
    expect(me.body.roles).toEqual(['ARCHER', 'COACH']);

    const athletes = await http().get('/api/v1/coach/athletes').set(as(coach)).expect(200);
    expect(athletes.body).toEqual([
      expect.objectContaining({
        id: archerId,
        name: 'Léa Archère',
        access: 'READ',
        disciplines: [],
        journal: expect.objectContaining({ id: journalId, title: 'Saison en cours' }),
      }),
    ]);
    expect(
      (await http().get('/api/v1/coach/athletes').set(as(otherCoach)).expect(200)).body,
    ).toEqual([]);
    await http().get(base()).set(as(otherCoach)).expect(404);
    await http().get(base()).expect(401);
  });

  it('reads the journal of the season in progress only', async () => {
    const past = await http()
      .post('/api/v1/journal/sessions')
      .set(as(archer))
      .send({ type: 'TRAINING', date: day(-100) })
      .expect(201);
    const current = await http()
      .post('/api/v1/journal/sessions')
      .set(as(archer))
      .send({ type: 'TRAINING', date: day(-2) })
      .expect(201);
    await http()
      .patch(`/api/v1/journal/sessions/${current.body.id}`)
      .set(as(archer))
      .send({ arrowCount: 72, score: 540, discipline: 'INDOOR', description: 'Bonne séance' })
      .expect(200);

    // The range is clipped to the current journal.
    const list = await http()
      .get(`${base()}/sessions`)
      .query({ from: day(-150), to: day(10) })
      .set(as(coach))
      .expect(200);
    expect(list.body.map((s: { id: string }) => s.id)).toEqual([current.body.id]);

    const sheet = await http()
      .get(`${base()}/sessions/${current.body.id}`)
      .set(as(coach))
      .expect(200);
    expect(sheet.body).toMatchObject({ score: 540, description: 'Bonne séance', plannedBy: null });
    await http().get(`${base()}/sessions/${past.body.id}`).set(as(coach)).expect(404);
    await http().get(`${base()}/sessions/${current.body.id}/photos`).set(as(coach)).expect(200);
    await http().get(`${base()}/sessions/${current.body.id}`).set(as(otherCoach)).expect(404);

    const stats = await http().get(`${base()}/sessions/stats`).set(as(coach)).expect(200);
    expect(stats.body.arrowsByDay).toEqual([{ date: day(-2), arrows: 72 }]);
    await http().get(`${base()}/goals`).set(as(coach)).expect(200);
    await http().get(`${base()}/event-types`).set(as(coach)).expect(200);
    await http().get(`${base()}/sessions/suggestions`).set(as(coach)).expect(200);
  });

  it('plans future events with write access only', async () => {
    const plan = {
      type: 'COACHING',
      date: day(5),
      location: ' Gymnase ',
      objective: 'Placement',
      steps: [
        { unit: 'MINUTES', amount: 15, target: 'STRAW', description: ' Échauffement ' },
        { unit: 'ARROWS', amount: 36, target: 'FACE', description: '6 volées à 18 m' },
      ],
    };
    await http().post(`${base()}/sessions`).set(as(coach)).send(plan).expect(403);

    await setAccess('WRITE');
    const planned = await http().post(`${base()}/sessions`).set(as(coach)).send(plan).expect(201);
    expect(planned.body).toMatchObject({
      type: 'COACHING',
      date: day(5),
      location: 'Gymnase',
      objective: 'Placement',
      // A planning field: not a review.
      steps: [
        { unit: 'MINUTES', amount: 15, target: 'STRAW', description: 'Échauffement' },
        { unit: 'ARROWS', amount: 36, target: 'FACE', description: '6 volées à 18 m' },
      ],
      plannedBy: { name: 'Camille Coach' },
      completed: false,
    });
    // The archer sees it in their journal, with who planned it.
    const own = await http()
      .get(`/api/v1/journal/sessions/${planned.body.id}`)
      .set(as(archer))
      .expect(200);
    expect(own.body.plannedBy.name).toBe('Camille Coach');

    // New to the archer until they open its sheet (reading it through the API isn't opening it).
    const newEvents = () => http().get('/api/v1/journal/sessions/new').set(as(archer)).expect(200);
    expect((await newEvents()).body).toEqual([
      expect.objectContaining({
        id: planned.body.id,
        type: 'COACHING',
        plannedBy: expect.objectContaining({ name: 'Camille Coach' }),
      }),
    ]);
    await http()
      .post(`/api/v1/journal/sessions/${planned.body.id}/seen`)
      .set(as(coach))
      .expect(404);
    await http()
      .post(`/api/v1/journal/sessions/${planned.body.id}/seen`)
      .set(as(archer))
      .expect(204);
    await http()
      .post(`/api/v1/journal/sessions/${planned.body.id}/seen`)
      .set(as(archer))
      .expect(204);
    expect((await newEvents()).body).toEqual([]);
    // Its calendar entry is marked too (the archer's own entries aren't).
    const entries = await http()
      .get('/api/v1/journal/sessions')
      .query({ from: day(-30), to: day(10) })
      .set(as(archer))
      .expect(200);
    expect(
      entries.body.map((s: { id: string; plannedByCoach: boolean }) => [s.id, s.plannedByCoach]),
    ).toEqual(
      expect.arrayContaining([
        [planned.body.id, true],
        [expect.any(String), false],
      ]),
    );

    // Today, past days, days after the journal and other types are refused.
    for (const date of [day(0), day(-1), day(201)]) {
      const refused = await http()
        .post(`${base()}/sessions`)
        .set(as(coach))
        .send({ ...plan, date })
        .expect(400);
      expect(refused.body.code).toBe('DATE_NOT_PLANNABLE');
    }
    for (const type of ['OTHER', 'CUSTOM']) {
      await http()
        .post(`${base()}/sessions`)
        .set(as(coach))
        .send({ ...plan, type })
        .expect(400);
    }
    // Only the planning fields.
    await http()
      .post(`${base()}/sessions`)
      .set(as(coach))
      .send({ ...plan, score: 500 })
      .expect(400);

    const moved = await http()
      .patch(`${base()}/sessions/${planned.body.id}`)
      .set(as(coach))
      .send({ date: day(6), distanceMeters: 18, discipline: 'INDOOR' })
      .expect(200);
    expect(moved.body).toMatchObject({ date: day(6), distanceMeters: 18, discipline: 'INDOOR' });
    const toPast = await http()
      .patch(`${base()}/sessions/${planned.body.id}`)
      .set(as(coach))
      .send({ date: day(-1) })
      .expect(400);
    expect(toPast.body.code).toBe('DATE_NOT_PLANNABLE');
    await http()
      .patch(`${base()}/sessions/${planned.body.id}`)
      .set(as(coach))
      .send({ satisfaction: 8 })
      .expect(400);

    // The archer's own events stay theirs.
    const archers = await http()
      .post('/api/v1/journal/sessions')
      .set(as(archer))
      .send({ type: 'TRAINING', date: day(7) })
      .expect(201);
    await http()
      .patch(`${base()}/sessions/${archers.body.id}`)
      .set(as(coach))
      .send({ objective: 'Non' })
      .expect(403);
    await http().delete(`${base()}/sessions/${archers.body.id}`).set(as(coach)).expect(403);

    // Back to read-only: nothing changes any more.
    await setAccess('READ');
    await http().delete(`${base()}/sessions/${planned.body.id}`).set(as(coach)).expect(403);
    await setAccess('WRITE');
    await http().delete(`${base()}/sessions/${planned.body.id}`).set(as(coach)).expect(204);
    await http().get(`/api/v1/journal/sessions/${planned.body.id}`).set(as(archer)).expect(404);
  });

  it("shows the archer's FFTA competitions, which a coach with write access adds", async () => {
    // The archer's departments and disciplines decide (Essonne, 91, is "dep[]=92" on the site).
    await http()
      .patch('/api/v1/profile')
      .set(as(archer))
      .send({ departments: ['91'], disciplines: ['NATURE'] })
      .expect(200);
    const competition = {
      id: '27001',
      title: 'TIR NATURE à DRAVEIL',
      startDate: day(10),
      endDate: day(11),
      city: 'DRAVEIL',
      organizer: 'ARCHERS DE DRAVEIL',
      teamOnly: false,
      status: 'SCHEDULED' as const,
      mandateUrl: null,
    };
    // Beyond the season in progress (it ends at day 200): left out.
    ctx.ffta.results.set('92:109', [
      competition,
      { ...competition, id: '27002', startDate: day(250), endDate: day(250) },
    ]);

    await setAccess('READ');
    const { body } = await http().get(`${base()}/competitions`).set(as(coach)).expect(200);
    expect(body).toMatchObject({ departments: [{ code: '91' }], complete: true });
    expect(body.competitions).toEqual([
      expect.objectContaining({
        id: '27001',
        discipline: 'NATURE',
        url: 'https://www.ffta.fr/epreuve/27001',
      }),
    ]);
    await http().get(`${base()}/competitions`).set(as(otherCoach)).expect(404);

    const plan = () =>
      http()
        .post(`${base()}/sessions`)
        .set(as(coach))
        .send({
          type: 'COMPETITION',
          date: day(10),
          location: competition.title,
          discipline: 'NATURE',
          fftaCompetitionId: '27001',
        });
    await plan().expect(403);
    await setAccess('WRITE');
    const planned = await plan().expect(201);
    expect(planned.body).toMatchObject({
      fftaCompetitionId: '27001',
      plannedByCoach: true,
      plannedBy: expect.objectContaining({ name: 'Camille Coach' }),
    });
    await plan().expect(201);
    expect((await plan().expect(409)).body.code).toBe('LIMIT_REACHED');
  });

  it("lets the archer's coaches comment on an event, new to the archer until they open it", async () => {
    const sessionId = (
      await http()
        .post('/api/v1/journal/sessions')
        .set(as(archer))
        .send({ type: 'TRAINING', date: day(-2) })
        .expect(201)
    ).body.id as string;
    const comments = `${base()}/sessions/${sessionId}/comments`;
    // Read-only access is enough: a comment changes nothing of the sheet.
    await setAccess('READ');
    const added = await http()
      .post(comments)
      .set(as(coach))
      .send({ text: '  Belle régularité, garde ce placement.  ' })
      .expect(201);
    expect(added.body).toMatchObject({
      text: 'Belle régularité, garde ce placement.',
      coach: { name: 'Camille Coach' },
      isNew: true,
      mine: true,
    });
    expect((await http().post(comments).set(as(coach)).send({ text: '   ' })).status).toBe(400);
    // One comment per coach: they change it rather than add another.
    const second = await http().post(comments).set(as(coach)).send({ text: 'Encore un mot' });
    expect(second.status).toBe(409);
    expect(second.body.code).toBe('LIMIT_REACHED');
    // Someone who doesn't coach the archer gets nothing.
    await http().post(comments).set(as(otherCoach)).send({ text: 'Hello' }).expect(404);

    // The archer sees it, and the home page lists the event until its sheet is opened.
    const own = await http()
      .get(`/api/v1/journal/sessions/${sessionId}/comments`)
      .set(as(archer))
      .expect(200);
    expect(own.body).toEqual([expect.objectContaining({ isNew: true, mine: false })]);
    const news = await http()
      .get('/api/v1/journal/sessions/new-comments')
      .set(as(archer))
      .expect(200);
    expect(news.body).toEqual([
      expect.objectContaining({
        id: sessionId,
        newComments: 1,
        coach: expect.objectContaining({ name: 'Camille Coach' }),
      }),
    ]);
    await http().post(`/api/v1/journal/sessions/${sessionId}/seen`).set(as(archer)).expect(204);
    expect(
      (await http().get('/api/v1/journal/sessions/new-comments').set(as(archer)).expect(200)).body,
    ).toEqual([]);

    // Changed by its author: new again.
    const commentId = added.body.id as string;
    const changed = await http()
      .patch(`${comments}/${commentId}`)
      .set(as(coach))
      .send({ text: 'Belle régularité !' })
      .expect(200);
    expect(changed.body).toMatchObject({ text: 'Belle régularité !', isNew: true });
    expect(
      (await http().get('/api/v1/journal/sessions/new-comments').set(as(archer)).expect(200)).body,
    ).toHaveLength(1);

    await http().delete(`${comments}/${commentId}`).set(as(coach)).expect(204);
    expect((await http().get(comments).set(as(coach)).expect(200)).body).toEqual([]);
    expect(
      (await http().get('/api/v1/journal/sessions/new-comments').set(as(archer)).expect(200)).body,
    ).toEqual([]);
    await setAccess('WRITE');
  });

  it('plans a session again for several archers at once', async () => {
    // Two more archers coached by the same coach: one with WRITE access, one read-only.
    const coachOf = async (token: string, email: string, coachAccess: 'READ' | 'WRITE') => {
      const invited = await http()
        .post('/api/v1/profile/invitations')
        .set(as(token))
        .send({ name: 'Camille', email, isCoach: true, coachAccess })
        .expect(201);
      const mail = ctx.outbox.filter((m) => m.to === email).at(-1);
      const token2 = mail?.text.match(/invitations\/accept\?token=([\w-]+)/)?.[1];
      await http()
        .post('/api/v1/invitations/accept')
        .set(as(coach))
        .send({ token: token2 })
        .expect(200);
      await http()
        .post('/api/v1/journals')
        .set(as(token))
        .send({ title: 'Saison', startDate: day(-10), endDate: day(10) })
        .expect(201);
      const id = (await http().get('/api/v1/users/me').set(as(token)).expect(200)).body.id;
      return { id: id as string, invitation: invited.body.id as string };
    };
    const writer = await signUp('c-writer', 'Alex Groupe');
    const reader = await signUp('c-reader', 'Noa Lecture');
    const w = await coachOf(writer, 'camille+w@club.fr', 'WRITE');
    const r = await coachOf(reader, 'camille+r@club.fr', 'READ');

    // The archer's own training, its steps ticked and reviewed.
    const source = await http()
      .post('/api/v1/journal/sessions')
      .set(as(archer))
      .send({ type: 'TRAINING', date: day(-1) })
      .expect(201);
    await http()
      .patch(`/api/v1/journal/sessions/${source.body.id}`)
      .set(as(archer))
      .send({
        durationMinutes: 90,
        location: 'Stade',
        objective: 'Régularité',
        steps: [{ unit: 'ARROWS', amount: 36, target: 'FACE', description: 'Volées', done: true }],
        score: 550,
      })
      .expect(200);
    const copy = `${base()}/sessions/${source.body.id}/copy`;

    const copied = await http()
      .post(copy)
      .set(as(coach))
      .send({ date: day(8), archerIds: [archerId, w.id, r.id] })
      .expect(201);
    expect(copied.body).toEqual([
      { archerId, name: 'Léa Archère', sessionId: expect.any(String), error: null },
      { archerId: w.id, name: 'Alex Groupe', sessionId: expect.any(String), error: null },
      { archerId: r.id, name: 'Noa Lecture', sessionId: null, error: 'FORBIDDEN' },
    ]);
    // Same planning, nothing ticked, no review, stamped by the coach: new to the archer.
    const planned = await http()
      .get(`/api/v1/journal/sessions/${copied.body[1].sessionId}`)
      .set(as(writer))
      .expect(200);
    expect(planned.body).toMatchObject({
      type: 'TRAINING',
      date: day(8),
      durationMinutes: 90,
      location: 'Stade',
      objective: 'Régularité',
      steps: [{ amount: 36, description: 'Volées', done: false }],
      score: null,
      plannedBy: { name: 'Camille Coach' },
    });
    expect(
      (await http().get('/api/v1/journal/sessions/new').set(as(writer)).expect(200)).body,
    ).toHaveLength(1);

    // Each archer's own journal decides: after its end, nothing for them.
    const late = await http()
      .post(copy)
      .set(as(coach))
      .send({ date: day(20), archerIds: [archerId, w.id] })
      .expect(201);
    expect(late.body.map((c: { error: string | null }) => c.error)).toEqual([
      null,
      'DATE_NOT_PLANNABLE',
    ]);
    // Someone the coach doesn't coach: nothing planned at all; past days and other types refused.
    const stranger = (await http().get('/api/v1/users/me').set(as(otherCoach)).expect(200)).body.id;
    await http()
      .post(copy)
      .set(as(coach))
      .send({ date: day(9), archerIds: [w.id, stranger] })
      .expect(404);
    const refused = await http()
      .post(copy)
      .set(as(coach))
      .send({ date: day(0), archerIds: [w.id] })
      .expect(201);
    expect(refused.body[0].error).toBe('DATE_NOT_PLANNABLE');
    await http()
      .post(copy)
      .set(as(coach))
      .send({ date: day(9), archerIds: [] })
      .expect(400);
    await http()
      .post(copy)
      .set(as(otherCoach))
      .send({ date: day(9), archerIds: [archerId] })
      .expect(404);
    const strength = await http()
      .post('/api/v1/journal/sessions')
      .set(as(archer))
      .send({ type: 'STRENGTH', date: day(-1) })
      .expect(201);
    await http()
      .post(`${base()}/sessions/${strength.body.id}/copy`)
      .set(as(coach))
      .send({ date: day(9), archerIds: [archerId] })
      .expect(400);

    for (const id of [
      source.body.id,
      strength.body.id,
      copied.body[0].sessionId,
      late.body[0].sessionId,
    ]) {
      await http().delete(`/api/v1/journal/sessions/${id}`).set(as(archer)).expect(204);
    }
    await http().delete(`/api/v1/profile/invitations/${w.invitation}`).set(as(writer)).expect(204);
    await http().delete(`/api/v1/profile/invitations/${r.invitation}`).set(as(reader)).expect(204);
  });

  it('ends with the invitation', async () => {
    await http().delete(`/api/v1/profile/invitations/${invitationId}`).set(as(archer)).expect(204);
    await http().get(base()).set(as(coach)).expect(404);
    expect((await http().get('/api/v1/coach/athletes').set(as(coach)).expect(200)).body).toEqual(
      [],
    );
    // No archer left to coach: no longer a coach.
    const me = await http().get('/api/v1/users/me').set(as(coach)).expect(200);
    expect(me.body.roles).toEqual(['ARCHER']);
  });
});
