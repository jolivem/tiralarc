import { PDFDocument, StandardFonts } from 'pdf-lib';
import request from 'supertest';
import { ScoreSheetsService } from '../src/score-sheets/score-sheets.service.js';
import { createTestApp, fakeIdToken, type TestContext } from './helpers.js';

const day = (offset: number) =>
  new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
const MONTHS = 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ');
/** "31 Oct", as ianseo's list writes a day. */
const listed = (date: string) => `${Number(date.slice(8))} ${MONTHS[Number(date.slice(5, 7)) - 1]}`;

/** A PDF of pages of rows, each row's cells side by side. */
async function pdf(pages: string[][][]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (const rows of pages) {
    const page = doc.addPage([842, 595]);
    rows.forEach((row, r) =>
      row.forEach((cell, c) =>
        page.drawText(cell, { x: 30 + c * 150, y: 550 - r * 30, size: 10, font }),
      ),
    );
  }
  return doc.save();
}

const sheet = (name: string, club: string) => [
  ['Archer:', name],
  ['Club:', club],
  ['Total', '540'],
];
const LICENCE = '0012345A';
const CLUB = '0878134';

describe('Score sheets (e2e)', () => {
  let ctx: TestContext;
  let archer: string;
  let archerId: string;
  let coach: string;
  let otherArcher: string;
  let competition: string;

  const http = () => request(ctx.app.getHttpServer());
  const as = (token: string) => ({ Authorization: `Bearer ${token}` });
  const signUp = async (sub: string) =>
    (
      await http()
        .post('/api/v1/auth/google')
        .send({ idToken: fakeIdToken(sub, `${sub}@gmail.com`, true, sub) })
        .expect(200)
    ).body.accessToken as string;
  const addCompetition = async (token: string, date: string, location = 'Villepreux') => {
    const created = await http()
      .post('/api/v1/journal/sessions')
      .set(as(token))
      .send({ type: 'COMPETITION', date, location })
      .expect(201);
    return created.body.id as string;
  };
  const run = () => ctx.app.get(ScoreSheetsService).run();
  const pagesOf = async (bytes: Buffer) => (await PDFDocument.load(bytes)).getPageCount();

  beforeAll(async () => {
    ctx = await createTestApp();
    archer = await signUp('s-archer');
    coach = await signUp('s-coach');
    otherArcher = await signUp('s-other');
    archerId = (await http().get('/api/v1/users/me').set(as(archer)).expect(200)).body.id;
    await http()
      .post('/api/v1/journals')
      .set(as(archer))
      .send({ title: 'Saison', startDate: day(-60), endDate: day(200) })
      .expect(201);
    const invited = await http()
      .post('/api/v1/profile/invitations')
      .set(as(archer))
      .send({ name: 'Coach', email: 'coach@club.fr', isCoach: true })
      .expect(201);
    expect(invited.body.id).toBeDefined();
    const mail = ctx.outbox.filter((m) => m.to === 'coach@club.fr').at(-1);
    const token = mail?.text.match(/invitations\/accept\?token=([\w-]+)/)?.[1];
    await http().post('/api/v1/invitations/accept').set(as(coach)).send({ token }).expect(200);

    const date = day(-2);
    const tour = '/TourData/2026/500';
    ctx.ianseo.list = `<table>
      <tr onclick="window.open('Details.php?toId=400','_self')"><td>Tir de Rouen</td><td class="column7">${listed(date)}</td></tr>
      <tr onclick="window.open('Details.php?toId=500','_self')"><td>Compagnie de Villepreux</td><td class="column7">${listed(date)}</td></tr>
    </table>`;
    ctx.ianseo.pages.set(
      500,
      `<a href="${tour}/feuilles matin.pdf?time=1"></a><a>Feuilles de marque</a>
       <a href="${tour}/ENA.pdf?time=2"></a><a>Participants</a>`,
    );
    ctx.ianseo.files.set(
      `${tour}/ENA.pdf`,
      await pdf([
        [
          ['0099999Z', 'Martin Paul', '0123456'],
          [LICENCE, 'Dupre Lea', CLUB],
        ],
      ]),
    );
    ctx.ianseo.files.set(
      `${tour}/feuilles matin.pdf`,
      await pdf([
        sheet('Martin Paul', '0123456'),
        sheet('Dupre Lea', CLUB),
        sheet('Dupre Lea', '0555555'),
      ]),
    );
    competition = await addCompetition(archer, date);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  const sheetOf = (id: string, token = archer) =>
    http().get(`/api/v1/journal/sessions/${id}`).set(as(token)).expect(200);

  it('waits for the licence and the names', async () => {
    await run();
    expect(ctx.ianseo.requests).toEqual([]);
    expect((await sheetOf(competition)).body.hasScoreSheet).toBe(false);
  });

  it('finds the page of the archer, once', async () => {
    await http()
      .patch('/api/v1/profile')
      .set(as(archer))
      .send({ licenceNumber: LICENCE, lastName: 'Dupré', firstName: 'Léa' })
      .expect(200);
    await run();
    expect(ctx.ianseo.requests[0]).toMatch(/^tours:/);
    // The competition at the event's place comes first, and is the right one.
    expect(ctx.ianseo.requests[1]).toBe('details:500');
    expect((await sheetOf(competition)).body.hasScoreSheet).toBe(true);

    const file = await http()
      .get(`/api/v1/journal/sessions/${competition}/score-sheet`)
      .set(as(archer))
      .responseType('blob')
      .expect(200)
      .expect('content-type', /application\/pdf/);
    expect(await pagesOf(file.body as Buffer)).toBe(1);

    const asked = ctx.ianseo.requests.length;
    await run();
    expect(ctx.ianseo.requests).toHaveLength(asked);
  });

  it('shows it to their coach, to nobody else', async () => {
    const file = await http()
      .get(`/api/v1/coach/athletes/${archerId}/sessions/${competition}/score-sheet`)
      .set(as(coach))
      .responseType('blob')
      .expect(200);
    expect(await pagesOf(file.body as Buffer)).toBe(1);
    await http()
      .get(`/api/v1/coach/athletes/${archerId}/sessions/${competition}/score-sheet`)
      .set(as(otherArcher))
      .expect(404);
    await http()
      .get(`/api/v1/journal/sessions/${competition}/score-sheet`)
      .set(as(otherArcher))
      .expect(404);
  });

  it('searches once a day, during the week after the competition only', async () => {
    const noSheet = await addCompetition(archer, day(-7), 'Ailleurs');
    const tooOld = await addCompetition(archer, day(-8), 'Ailleurs');
    const tomorrow = await addCompetition(archer, day(1), 'Ailleurs');
    ctx.ianseo.requests.length = 0;

    await run();
    const checked = await ctx.prisma.journalSession.findMany({
      where: { id: { in: [noSheet, tooOld, tomorrow] } },
      select: { id: true, scoreSheetCheckedOn: true },
    });
    const wasChecked = (id: string) =>
      checked.find((s) => s.id === id)?.scoreSheetCheckedOn !== null;
    expect(wasChecked(noSheet)).toBe(true);
    expect(wasChecked(tooOld)).toBe(false);
    expect(wasChecked(tomorrow)).toBe(false);

    const asked = ctx.ianseo.requests.length;
    await run();
    expect(ctx.ianseo.requests).toHaveLength(asked);
  });

  it('leaves out an archer not practising in France', async () => {
    await http()
      .patch('/api/v1/profile')
      .set(as(otherArcher))
      .send({
        practisesInFrance: false,
        licenceNumber: LICENCE,
        lastName: 'Dupré',
        firstName: 'Léa',
      })
      .expect(200);
    await http()
      .post('/api/v1/journals')
      .set(as(otherArcher))
      .send({ title: 'Saison', startDate: day(-60), endDate: day(200) })
      .expect(201);
    const id = await addCompetition(otherArcher, day(-2));
    await run();
    expect((await sheetOf(id, otherArcher)).body.hasScoreSheet).toBe(false);
  });
});
