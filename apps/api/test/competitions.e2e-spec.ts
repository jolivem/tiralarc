import request from 'supertest';
import { DEPARTMENTS } from '../src/competitions/departments.js';
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
  /** The searches of the archer's departments (not those of the championships, by words). */
  const departmentSearches = () => ctx.ffta.searches.filter((s) => !s.text);

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
    expect(body).toContainEqual({ code: '2A', name: 'Corse-du-Sud', region: 'Corse' });
    // Each in one of the 13 regions, or overseas.
    expect(new Set(body.map((d: { region: string }) => d.region)).size).toBe(14);
  });

  it('shows nothing without a department', async () => {
    const { body } = await list();
    expect(body).toEqual({ departments: [], competitions: [], complete: true });
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
      departments: ['78'],
      disciplines: ['INDOOR', 'TAE_INTERNATIONAL', 'NATURE'],
    });

    const { body } = await list();
    expect(body.departments).toEqual([{ code: '78', name: 'Yvelines', region: 'Île-de-France' }]);
    expect(body.complete).toBe(true);
    // Ended ones are left out, para ones too (not asked for); by first day.
    expect(body.competitions.map((c: { id: string }) => c.id)).toEqual(['2', '4', '3', '5']);
    expect(body.competitions[1]).toEqual({
      ...competition('4', 20),
      discipline: 'TAE_INTERNATIONAL',
      para: false,
      championship: null,
      url: 'https://www.ffta.fr/epreuve/4',
      dismissed: false,
    });
    expect(
      departmentSearches()
        .map((s) => s.discipline)
        .sort((a, b) => a - b),
    ).toEqual([102, 103, 109]);
    expect(departmentSearches()[0]).toMatchObject({ departmentIds: [79], start: day(0) });

    // Only the requested days.
    const window = await list(`?from=${day(15)}&to=${day(45)}`);
    expect(window.body.competitions.map((c: { id: string }) => c.id)).toEqual(['4', '3']);
    // Read once: the site is not asked again (three disciplines, in the department, its region
    // and France, for the championships).
    expect(ctx.ffta.searches).toHaveLength(9);
  });

  it('adds the para competitions when asked to', async () => {
    await setProfile({ paraCompetitions: true });
    const { body } = await list();
    expect(body.competitions.find((c: { id: string }) => c.id === '6')).toMatchObject({
      discipline: 'INDOOR',
      para: true,
    });
  });

  it('adds the departmental, regional and French championships of its disciplines', async () => {
    // Field archery (107), not searched yet. The Yvelines (78) are in Île-de-France.
    await setProfile({ disciplines: ['INDOOR', 'TAE_INTERNATIONAL', 'NATURE', 'FIELD'] });
    const region = DEPARTMENTS.filter((d) => d.region === 'Île-de-France')
      .flatMap((d) => d.fftaIds)
      .join(',');
    const titled = (id: string, offset: number, title: string) => ({
      ...competition(id, offset),
      title,
    });
    // The department's own competitions: its championship told by its title.
    ctx.ffta.results.set('79:107', [titled('30', 50, 'CHAMPIONNAT DÉPARTEMENTAL 78 à POISSY')]);
    // The region's, by the word "championnat": only its regional championships stay.
    ctx.ffta.results.set(`${region}:107`, [
      titled('31', 70, 'CHAMPIONNAT RÉGIONAL CAMPAGNE à ÉTAMPES'),
      titled('32', 40, 'CHAMPIONNAT DÉPARTEMENTAL 91 à ÉVRY'),
    ]);
    // France's, by the words "championnat de France": the qualifying ones left out.
    ctx.ffta.results.set(':107', [
      titled('33', 90, 'CHAMPIONNAT DE FRANCE PAR CATEGORIE à SAUMUR'),
      titled('34', 30, 'SÉLECTIF AU CHAMPIONNAT DE FRANCE à LIEVIN'),
    ]);

    const { body } = await list();
    const field = body.competitions.filter((c: { discipline: string }) => c.discipline === 'FIELD');
    expect(field.map((c: { id: string; championship: string }) => [c.id, c.championship])).toEqual([
      ['30', 'DEPARTMENTAL'],
      ['31', 'REGIONAL'],
      ['33', 'NATIONAL'],
    ]);
    expect(ctx.ffta.searches.filter((s) => s.discipline === 107)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ departmentIds: [79] }),
        expect.objectContaining({ text: 'championnat' }),
        expect.objectContaining({ departmentIds: [], text: 'championnat de france' }),
      ]),
    );

    // The young archers' championships for U11 to U21 only, the adults' for the others; those
    // for all ages (by categories) for everyone.
    ctx.ffta.results.set(':108', [
      titled('40', 80, 'CHAMPIONNAT DE FRANCE JEUNE 3D à RIOM'),
      titled('41', 85, 'CHAMPIONNAT DE FRANCE ADULTE 3D à YZEURE'),
      titled('42', 88, 'CHAMPIONNAT DE FRANCE 3D PAR CATEGORIES à AMILLY'),
    ]);
    await setProfile({ disciplines: ['THREE_D'], departments: [] });
    const shown = async () =>
      (await list()).body.competitions.map((c: { id: string }) => c.id).sort();
    expect(await shown()).toEqual(['40', '41', '42']);
    await setProfile({ category: 'U18' });
    expect(await shown()).toEqual(['40', '42']);
    await setProfile({ category: 'S2' });
    expect(await shown()).toEqual(['41', '42']);

    await setProfile({
      disciplines: ['INDOOR', 'TAE_INTERNATIONAL', 'NATURE'],
      departments: ['78'],
      category: null,
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

  it('merges the competitions of several departments', async () => {
    // Essonne (91) is "dep[]=92" on the site; a competition listed in both shows once.
    ctx.ffta.results.set('92:103', [competition('8', 25), competition('3', 40)]);
    await setProfile({ departments: ['91', '78'], paraCompetitions: false });
    const { body } = await list();
    expect(body.departments).toEqual([
      { code: '91', name: 'Essonne', region: 'Île-de-France' },
      { code: '78', name: 'Yvelines', region: 'Île-de-France' },
    ]);
    expect(body.competitions.map((c: { id: string }) => c.id)).toEqual(['2', '4', '8', '3', '5']);
  });

  it('says when the website could not be read', async () => {
    ctx.ffta.failing.add('76:103');
    ctx.ffta.results.set('76:109', [competition('7', 3)]);
    await setProfile({
      departments: ['75'],
      disciplines: ['INDOOR', 'NATURE'],
      paraCompetitions: false,
    });
    const { body } = await list();
    expect(body).toMatchObject({ complete: false, departments: [{ code: '75' }] });
    expect(body.competitions.map((c: { id: string }) => c.id)).toEqual(['7']);
  });

  it('shows no FFTA competition nor ranking to an archer not practising in France', async () => {
    const searches = ctx.ffta.searches.length;
    await setProfile({ practisesInFrance: false });
    expect((await list()).body).toEqual({ departments: [], competitions: [], complete: true });
    const rankings = await http().get('/api/v1/rankings').set(as(archer)).expect(200);
    expect(rankings.body).toEqual({ season: null, missing: [], rankings: [], complete: true });
    expect(ctx.ffta.searches).toHaveLength(searches);
    // The departments stay picked, for when they practise in France again.
    await setProfile({ practisesInFrance: true });
    expect((await list()).body.departments).toEqual([
      { code: '75', name: 'Paris', region: 'Île-de-France' },
    ]);
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

  it('rejects an unknown department, or more than five', async () => {
    for (const departments of [['20'], ['01', '02', '03', '04', '05', '06'], ['78', '78']]) {
      const { body } = await http()
        .patch('/api/v1/profile')
        .set(as(archer))
        .send({ departments })
        .expect(400);
      expect(body.code).toBe('VALIDATION_FAILED');
    }
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
