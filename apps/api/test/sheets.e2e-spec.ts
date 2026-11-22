import sharp from 'sharp';
import request from 'supertest';
import { createTestApp, fakeIdToken, type TestContext } from './helpers.js';

describe('Sheets (e2e)', () => {
  let ctx: TestContext;
  let archer: string;
  let archerId: string;
  let coach: string;
  let other: string;

  const http = () => request(ctx.app.getHttpServer());
  const as = (token: string) => ({ Authorization: `Bearer ${token}` });
  const signUp = async (sub: string, name: string) =>
    (
      await http()
        .post('/api/v1/auth/google')
        .send({ idToken: fakeIdToken(sub, `${sub}@gmail.com`, true, name) })
        .expect(200)
    ).body.accessToken as string;
  const sheets = '/api/v1/sheets';

  beforeAll(async () => {
    ctx = await createTestApp();
    archer = await signUp('s-archer', 'Léa Fiches');
    coach = await signUp('s-coach', 'Camille Coach');
    other = await signUp('s-other', 'Sam Autre');
    archerId = (await http().get('/api/v1/users/me').set(as(archer)).expect(200)).body.id;
    await http()
      .post('/api/v1/profile/invitations')
      .set(as(archer))
      .send({ name: 'Camille', email: 'camille@fiches.fr', isCoach: true })
      .expect(201);
    const mail = ctx.outbox.filter((m) => m.to === 'camille@fiches.fr').at(-1);
    const token = mail?.text.match(/invitations\/accept\?token=([\w-]+)/)?.[1];
    await http().post('/api/v1/invitations/accept').set(as(coach)).send({ token }).expect(200);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('offers ready-made sheets by category, in the site’s language', async () => {
    const templates = `${sheets}/templates`;
    const settings = await http()
      .get(templates)
      .query({ category: 'SETTINGS' })
      .set(as(archer))
      .expect(200);
    expect(settings.body.map((s: { title: string }) => s.title)).toEqual([
      'Ma corde',
      'Mes flèches',
      'Mon arc',
      'Repères du viseur',
    ]);
    // Lines to fill in.
    expect(settings.body[0].body).toMatch(/^Date de montage :\nMatériau/);
    const english = await http()
      .get(templates)
      .query({ category: 'SETTINGS', locale: 'en' })
      .set(as(archer))
      .expect(200);
    expect(english.body[0].title).toBe('My string');
    // A language without templates: the French ones. Every category has some.
    const all = await http().get(templates).query({ locale: 'de' }).set(as(archer)).expect(200);
    expect(new Set(all.body.map((s: { category: string }) => s.category))).toEqual(
      new Set(['TECHNIQUE', 'SETTINGS', 'STRENGTH', 'MENTAL']),
    );
    expect(all.body[0].title).not.toMatch(/^My /);
    await http().get(templates).query({ category: 'X' }).set(as(archer)).expect(400);

    // A sheet started from a template: its text; one of another category isn't found.
    const string = settings.body[0];
    const created = await http()
      .post(sheets)
      .set(as(archer))
      .send({ category: 'SETTINGS', title: 'Corde 2027', templateId: string.id })
      .expect(201);
    expect(created.body).toMatchObject({ title: 'Corde 2027', body: string.body });
    await http()
      .post(sheets)
      .set(as(archer))
      .send({ category: 'MENTAL', title: 'X', templateId: string.id })
      .expect(404);
    await http().delete(`${sheets}/${created.body.id}`).set(as(archer)).expect(204);
  });

  it('lets the admins write the templates in both languages, hidden while not ready', async () => {
    const admin = '/api/v1/admin/sheet-templates';
    const offered = async (locale: string) =>
      (
        await http()
          .get(`${sheets}/templates`)
          .query({ category: 'MENTAL', locale })
          .set(as(archer))
          .expect(200)
      ).body.map((s: { title: string }) => s.title);
    // Archers only read them.
    await http().get(admin).set(as(archer)).expect(403);
    await http().post(admin).set(as(archer)).send({}).expect(403);

    // An admin (granted out of band, effective at the next token).
    const user = await ctx.prisma.user.findUniqueOrThrow({ where: { email: 's-other@gmail.com' } });
    await ctx.prisma.userRole.create({ data: { userId: user.id, role: 'ADMIN' } });
    const token = await signUp('s-other', 'Sam Autre');
    const before = await offered('fr');

    const created = await http()
      .post(admin)
      .set(as(token))
      .send({
        category: 'MENTAL',
        titleFr: ' Respiration ',
        bodyFr: 'Inspirer :\r\nExpirer :',
        titleEn: 'Breathing',
        bodyEn: 'Breathe in:\nBreathe out:',
        hidden: true,
      })
      .expect(201);
    expect(created.body).toMatchObject({
      titleFr: 'Respiration',
      bodyFr: 'Inspirer :\nExpirer :',
      position: before.length + 1,
      hidden: true,
    });
    const id = created.body.id as string;
    await http().post(admin).set(as(token)).send({ category: 'MENTAL', titleFr: 'X' }).expect(400);
    // Hidden: not offered, nor usable.
    expect(await offered('fr')).toEqual(before);
    await http()
      .post(sheets)
      .set(as(archer))
      .send({ category: 'MENTAL', title: 'X', templateId: id })
      .expect(404);

    // Shown, then moved up a place: offered in each language, there.
    await http().patch(`${admin}/${id}`).set(as(token)).send({ hidden: false }).expect(200);
    const moved = await http()
      .post(`${admin}/${id}/move`)
      .set(as(token))
      .send({ direction: 'UP' })
      .expect(200);
    expect(moved.body.find((t: { id: string }) => t.id === id).position).toBe(before.length);
    expect(await offered('fr')).toEqual([
      ...before.slice(0, -1),
      'Respiration',
      ...before.slice(-1),
    ]);
    expect(await offered('en')).toContain('Breathing');
    const sheet = await http()
      .post(sheets)
      .set(as(archer))
      .send({ category: 'MENTAL', title: 'Souffle', templateId: id, locale: 'en' })
      .expect(201);
    expect(sheet.body.body).toBe('Breathe in:\nBreathe out:');

    // Deleted: the sheet keeps its text; the others close up again.
    await http().delete(`${admin}/${id}`).set(as(token)).expect(204);
    await http().delete(`${admin}/${id}`).set(as(token)).expect(404);
    expect(await offered('fr')).toEqual(before);
    expect(
      (await http().get(`${sheets}/${sheet.body.id}`).set(as(archer)).expect(200)).body.body,
    ).toBe('Breathe in:\nBreathe out:');
    await http().delete(`${sheets}/${sheet.body.id}`).set(as(archer)).expect(204);
    const positions = (await http().get(admin).set(as(token)).expect(200)).body
      .filter((t: { category: string }) => t.category === 'MENTAL')
      .map((t: { position: number }) => t.position);
    expect(positions).toEqual(before.map((_: string, i: number) => i + 1));
  });

  it('takes up to 4 photos on a technique sheet only, removed with it', async () => {
    const picture = await sharp({
      create: { width: 1200, height: 800, channels: 3, background: '#cc6633' },
    })
      .jpeg()
      .toBuffer();
    const create = async (category: string) =>
      (
        await http()
          .post(sheets)
          .set(as(archer))
          .send({ category, title: 'Avec photos' })
          .expect(201)
      ).body.id as string;
    const upload = (sheetId: string, token = archer) =>
      http()
        .post(`${sheets}/${sheetId}/photos`)
        .set(as(token))
        .attach('file', picture, 'photo.jpg');

    // Only technique sheets take photos.
    const settings = await create('SETTINGS');
    expect((await upload(settings).expect(400)).body.code).toBe('VALIDATION_FAILED');

    const technique = await create('TECHNIQUE');
    const added = await upload(technique).expect(201);
    expect(added.body).toMatchObject({ width: 1200, height: 800 });
    expect(added.body.url).toContain(`sheets/${technique}/${added.body.id}.webp`);
    for (let i = 0; i < 3; i++) await upload(technique).expect(201);
    expect((await upload(technique).expect(409)).body.code).toBe('LIMIT_REACHED');
    // Someone else's sheet: not found; their coach reads them.
    await upload(technique, other).expect(404);
    const photos = `${sheets}/${technique}/photos`;
    expect((await http().get(photos).set(as(archer)).expect(200)).body).toHaveLength(4);
    expect(
      (
        await http()
          .get(`/api/v1/coach/athletes/${archerId}/sheets/${technique}/photos`)
          .set(as(coach))
          .expect(200)
      ).body,
    ).toHaveLength(4);

    // One photo deleted, then the sheet with the rest: their files go too.
    await http().delete(`${photos}/${added.body.id}`).set(as(archer)).expect(204);
    const files = () => [...ctx.files.keys()].filter((key) => key.includes(technique));
    expect(files()).toHaveLength(6);
    await http().delete(`${sheets}/${technique}`).set(as(archer)).expect(204);
    expect(files()).toHaveLength(0);
    await http().delete(`${sheets}/${settings}`).set(as(archer)).expect(204);
  });

  it('keeps a strength programme on strength sheets and strength events', async () => {
    const plank = {
      exercise: 'PLANK_FRONT',
      name: ' Gainage face ',
      sets: 3,
      measure: 'SECONDS',
      amount: 30,
      load: 'BODYWEIGHT',
      loadKg: 12,
      restSeconds: 45,
    };
    const curl = {
      exercise: null,
      name: 'Curl haltère',
      sets: 4,
      measure: 'REPS',
      amount: 10,
      load: 'KG',
      loadKg: 5,
      restSeconds: null,
      note: 'Lentement',
      done: true,
    };
    const strength = (
      await http()
        .post(sheets)
        .set(as(archer))
        .send({ category: 'STRENGTH', title: 'Haut du corps' })
        .expect(201)
    ).body;
    expect(strength.strengthSteps).toEqual([]);
    const saved = await http()
      .patch(`${sheets}/${strength.id}`)
      .set(as(archer))
      .send({ strengthSteps: [plank, curl] })
      .expect(200);
    // Stored clean: the name trimmed, a weight only with KG, nothing ticked on a sheet.
    expect(saved.body.strengthSteps).toEqual([
      { ...plank, name: 'Gainage face', loadKg: null, note: '', done: false },
      { ...curl, done: false },
    ]);
    await http()
      .patch(`${sheets}/${strength.id}`)
      .set(as(archer))
      .send({ strengthSteps: [{ ...plank, sets: 0 }] })
      .expect(400);
    const technique = (
      await http()
        .post(sheets)
        .set(as(archer))
        .send({ category: 'TECHNIQUE', title: 'X' })
        .expect(201)
    ).body.id;
    await http()
      .patch(`${sheets}/${technique}`)
      .set(as(archer))
      .send({ strengthSteps: [plank] })
      .expect(400);

    // A strength event takes the programme (copied by the client), ticked once done.
    const event = (
      await http()
        .post('/api/v1/journal/sessions')
        .set(as(archer))
        .send({ type: 'STRENGTH', date: '2026-10-05' })
        .expect(201)
    ).body.id;
    const ticked = await http()
      .patch(`/api/v1/journal/sessions/${event}`)
      .set(as(archer))
      .send({ strengthSteps: saved.body.strengthSteps.map((s: object) => ({ ...s, done: true })) })
      .expect(200);
    expect(ticked.body.strengthSteps.map((s: { done: boolean }) => s.done)).toEqual([true, true]);
    const training = (
      await http()
        .post('/api/v1/journal/sessions')
        .set(as(archer))
        .send({ type: 'TRAINING', date: '2026-10-05' })
        .expect(201)
    ).body.id;
    await http()
      .patch(`/api/v1/journal/sessions/${training}`)
      .set(as(archer))
      .send({ strengthSteps: [plank] })
      .expect(400);

    for (const id of [strength.id, technique]) {
      await http().delete(`${sheets}/${id}`).set(as(archer)).expect(204);
    }
    for (const id of [event, training]) {
      await http().delete(`/api/v1/journal/sessions/${id}`).set(as(archer)).expect(204);
    }
  });

  it('keeps the archer’s sheets in four categories, their coach reading them', async () => {
    const created = await http()
      .post(sheets)
      .set(as(archer))
      .send({ category: 'SETTINGS', title: ' Viseur 70 m ', body: 'Repère 5,2\r\nBand 21 cm\n\n' })
      .expect(201);
    expect(created.body).toMatchObject({
      category: 'SETTINGS',
      title: 'Viseur 70 m',
      body: 'Repère 5,2\nBand 21 cm',
    });
    const id = created.body.id as string;
    await http()
      .post(sheets)
      .set(as(archer))
      .send({ category: 'MENTAL', title: 'Routine' })
      .expect(201);
    await http().post(sheets).set(as(archer)).send({ category: 'OTHER', title: 'X' }).expect(400);
    await http().post(sheets).set(as(archer)).send({ category: 'MENTAL', title: '  ' }).expect(400);

    // The indexes: titles only.
    const list = await http().get(sheets).set(as(archer)).expect(200);
    expect(list.body.map((s: { title: string }) => s.title)).toEqual(['Routine', 'Viseur 70 m']);
    expect(list.body[0]).not.toHaveProperty('body');
    // With their texts, oldest first (the PDF extract).
    const all = await http().get(`${sheets}/all`).set(as(archer)).expect(200);
    expect(all.body.map((s: { body: string }) => s.body)).toEqual(['Repère 5,2\nBand 21 cm', '']);

    const changed = await http()
      .patch(`${sheets}/${id}`)
      .set(as(archer))
      .send({ body: 'Repère 5,3' })
      .expect(200);
    expect(changed.body).toMatchObject({ title: 'Viseur 70 m', body: 'Repère 5,3' });

    // Someone else's: not found. The coach reads, never writes.
    await http().get(`${sheets}/${id}`).set(as(other)).expect(404);
    await http().patch(`${sheets}/${id}`).set(as(other)).send({ title: 'X' }).expect(404);
    const coached = `/api/v1/coach/athletes/${archerId}/sheets`;
    expect((await http().get(coached).set(as(coach)).expect(200)).body).toHaveLength(2);
    expect((await http().get(`${coached}/${id}`).set(as(coach)).expect(200)).body.body).toBe(
      'Repère 5,3',
    );
    await http().get(coached).set(as(other)).expect(404);
    await http().patch(`${sheets}/${id}`).set(as(coach)).send({ title: 'X' }).expect(404);

    await http().delete(`${sheets}/${id}`).set(as(archer)).expect(204);
    await http().get(`${sheets}/${id}`).set(as(archer)).expect(404);
    expect((await http().get(sheets).set(as(archer)).expect(200)).body).toHaveLength(1);
  });
});
