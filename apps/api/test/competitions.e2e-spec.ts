import request from 'supertest';
import type { FftaCompetition } from '../src/competitions/ffta-parser.js';
import { createTestApp, fakeIdToken, type TestContext } from './helpers.js';

/** YYYY-MM-DD, `offset` days from today. */
const day = (offset: number) =>
  new Date(Date.now() + offset * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

const competition = (id: string, start: number, end = start): FftaCompetition => ({
  id,
  title: `Concours ${id}`,
  startDate: day(start),
  endDate: day(end),
  city: 'VILLEPREUX',
  organizer: "CIE D'ARC DE VILLEPREUX",
  teamOnly: false,
  status: 'SCHEDULED',
  mandateUrl: null,
});

describe('Competitions (e2e)', () => {
  let ctx: TestContext;
  let archer: string;

  const http = () => request(ctx.app.getHttpServer());
  const as = (token: string) => ({ Authorization: `Bearer ${token}` });
  const setProfile = (body: object) =>
    http().patch('/api/v1/profile').set(as(archer)).send(body).expect(200);
  const list = (query = '') =>
    http().get(`/api/v1/competitions${query}`).set(as(archer)).expect(200);

  beforeAll(async () => {
    ctx = await createTestApp();
    archer = (
      await http()
        .post('/api/v1/auth/google')
        .send({ idToken: fakeIdToken('c-archer', 'c-archer@gmail.com') })
        .expect(200)
    ).body.accessToken as string;
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('lists the departments to choose from', async () => {
    const { body } = await http()
      .get('/api/v1/competitions/departments')
      .set(as(archer))
      .expect(200);
    expect(body).toHaveLength(102);
    expect(body).toContainEqual({ code: '2A', name: 'Corse-du-Sud' });
  });

  it('shows nothing without a department', async () => {
    const { body } = await list();
    expect(body).toEqual({ department: null, competitions: [], complete: true });
    expect(ctx.ffta.searches).toHaveLength(0);
  });

  it("lists the department's upcoming competitions in the archer's disciplines", async () => {
    // Yvelines (78) is "dep[]=79" on the FFTA website.
    ctx.ffta.results.set('79:103', [
      competition('3', 40),
      competition('1', -5, -4),
      competition('2', 0, 1),
    ]);
    ctx.ffta.results.set('79:102', [competition('4', 20)]);
    ctx.ffta.results.set('79:109', [competition('5', 300)]);
    ctx.ffta.results.set('79:118', [competition('6', 10)]);
    await setProfile({
      department: '78',
      disciplines: ['INDOOR', 'TAE_INTERNATIONAL', 'NATURE'],
    });

    const { body } = await list();
    expect(body.department).toEqual({ code: '78', name: 'Yvelines' });
    expect(body.complete).toBe(true);
    // Ended ones are left out, para ones too (not asked for); by first day.
    expect(body.competitions.map((c: { id: string }) => c.id)).toEqual(['2', '4', '3', '5']);
    expect(body.competitions[1]).toEqual({
      ...competition('4', 20),
      discipline: 'TAE_INTERNATIONAL',
      para: false,
      url: 'https://www.ffta.fr/epreuve/4',
      dismissed: false,
    });
    expect(ctx.ffta.searches.map((s) => s.discipline).sort((a, b) => a - b)).toEqual([
      102, 103, 109,
    ]);
    expect(ctx.ffta.searches[0]).toMatchObject({ departmentIds: [79], start: day(0) });

    // Only the requested days.
    const window = await list(`?from=${day(15)}&to=${day(45)}`);
    expect(window.body.competitions.map((c: { id: string }) => c.id)).toEqual(['4', '3']);
    // Read once: the site is not asked again.
    expect(ctx.ffta.searches).toHaveLength(3);
  });

  it('adds the para competitions when asked to', async () => {
    await setProfile({ paraCompetitions: true });
    const { body } = await list();
    expect(body.competitions.find((c: { id: string }) => c.id === '6')).toMatchObject({
      discipline: 'INDOOR',
      para: true,
    });
  });

  it('keeps the competitions the archer will not take part in, marked', async () => {
    const dismissed = async () =>
      (await list()).body.competitions.find((c: { id: string }) => c.id === '4')?.dismissed;
    await http().put('/api/v1/competitions/4/dismissal').set(as(archer)).expect(204);
    await http().put('/api/v1/competitions/4/dismissal').set(as(archer)).expect(204);
    expect(await dismissed()).toBe(true);
    await http().delete('/api/v1/competitions/4/dismissal').set(as(archer)).expect(204);
    expect(await dismissed()).toBe(false);
    await http().put('/api/v1/competitions/abc/dismissal').set(as(archer)).expect(404);
  });

  it('says when the website could not be read', async () => {
    ctx.ffta.failing.add('76:103');
    ctx.ffta.results.set('76:109', [competition('7', 3)]);
    await setProfile({
      department: '75',
      disciplines: ['INDOOR', 'NATURE'],
      paraCompetitions: false,
    });
    const { body } = await list();
    expect(body).toMatchObject({ complete: false, department: { code: '75' } });
    expect(body.competitions.map((c: { id: string }) => c.id)).toEqual(['7']);
  });

  it("links to a competition's results once published", async () => {
    const results = (id: string) =>
      http().get(`/api/v1/competitions/${id}/results`).set(as(archer));
    ctx.ffta.places.set('26400', 'VERSAILLES');
    expect((await results('26400').expect(200)).body).toEqual({ url: null });
    // Unreadable page: no results either.
    expect((await results('26401').expect(200)).body).toEqual({ url: null });
    await results('abc').expect(404);

    // Published: the PDF on the FFTA extranet.
    ctx.ffta.places.set('26402', 'VERSAILLES');
    ctx.ffta.resultUrls.set('26402', 'https://extranet.ffta.fr/pdfresultats/2026/T_1.pdf');
    expect((await results('26402').expect(200)).body).toEqual({
      url: 'https://extranet.ffta.fr/pdfresultats/2026/T_1.pdf',
    });
  });

  it('rejects an unknown department', async () => {
    const { body } = await http()
      .patch('/api/v1/profile')
      .set(as(archer))
      .send({ department: '20' })
      .expect(400);
    expect(body.code).toBe('VALIDATION_FAILED');
  });

  it('adds a competition to the journal, place and discipline filled in', async () => {
    const { body } = await http()
      .post('/api/v1/journal/sessions')
      .set(as(archer))
      .send({
        type: 'COMPETITION',
        date: day(20),
        location: ' Concours 4 ',
        discipline: 'TAE_INTERNATIONAL',
      })
      .expect(201);
    expect(body).toMatchObject({
      type: 'COMPETITION',
      date: day(20),
      location: 'Concours 4',
      discipline: 'TAE_INTERNATIONAL',
      fftaCompetitionId: null,
    });
  });

  it('adds one FFTA competition at most twice a day, others still', async () => {
    const add = (fftaCompetitionId: string, offset: number) =>
      http()
        .post('/api/v1/journal/sessions')
        .set(as(archer))
        .send({
          type: 'COMPETITION',
          date: day(offset),
          location: `Concours ${fftaCompetitionId}`,
          fftaCompetitionId,
        });
    // The place comes from the competition's FFTA page; 26350's can't be read: the name given.
    ctx.ffta.places.set('26349', 'gymnase Alain Mimoun, 78450 VILLEPREUX');
    const first = await add('26349', 30).expect(201);
    expect(first.body).toMatchObject({
      fftaCompetitionId: '26349',
      location: 'gymnase Alain Mimoun, 78450 VILLEPREUX',
      distanceMeters: null,
    });
    // An indoor one is shot at 18 m.
    const indoor = await http()
      .post('/api/v1/journal/sessions')
      .set(as(archer))
      .send({
        type: 'COMPETITION',
        date: day(33),
        discipline: 'INDOOR',
        fftaCompetitionId: '26360',
      })
      .expect(201);
    expect(indoor.body).toMatchObject({ discipline: 'INDOOR', distanceMeters: 18 });
    await add('26349', 30).expect(201);
    const third = await add('26349', 30).expect(409);
    expect(third.body.code).toBe('LIMIT_REACHED');
    // Another competition that day, and the same one on another day.
    expect((await add('26350', 30).expect(201)).body.location).toBe('Concours 26350');
    await add('26349', 31).expect(201);

    // Its day is the competition's; the rest of the sheet changes as usual.
    const sheet = `/api/v1/journal/sessions/${first.body.id}`;
    const moved = await http()
      .patch(sheet)
      .set(as(archer))
      .send({ date: day(32) })
      .expect(400);
    expect(moved.body.code).toBe('DATE_LOCKED');
    await http()
      .patch(sheet)
      .set(as(archer))
      .send({ date: day(30), location: 'Gymnase', objective: 'Podium' })
      .expect(200);

    const { body } = await http()
      .get(`/api/v1/journal/sessions?from=${day(30)}&to=${day(30)}`)
      .set(as(archer))
      .expect(200);
    expect(body.map((s: { fftaCompetitionId: string }) => s.fftaCompetitionId).sort()).toEqual([
      '26349',
      '26349',
      '26350',
    ]);
  });
});
