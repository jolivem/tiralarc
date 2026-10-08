import sharp from 'sharp';
import request from 'supertest';
import { createTestApp, fakeIdToken, type TestContext } from './helpers.js';

describe('Event photos (e2e)', () => {
  let ctx: TestContext;
  let archer: string;
  let otherArcher: string;
  let journalId: string;
  /** 3000 × 1500 JPEG carrying a GPS position, like a phone picture. */
  let picture: Buffer;

  const http = () => request(ctx.app.getHttpServer());
  const as = (token: string) => ({ Authorization: `Bearer ${token}` });
  const signUp = async (sub: string) =>
    (
      await http()
        .post('/api/v1/auth/google')
        .send({ idToken: fakeIdToken(sub, `${sub}@gmail.com`), roles: ['ARCHER'] })
        .expect(200)
    ).body.accessToken as string;
  const createSession = async (type = 'COMPETITION') =>
    (
      await http()
        .post('/api/v1/journal/sessions')
        .set(as(archer))
        .send({ journalId, type, date: '2026-10-10' })
        .expect(201)
    ).body.id as string;
  const upload = (sessionId: string, file: Buffer, token = archer, name = 'photo.jpg') =>
    http()
      .post(`/api/v1/journal/sessions/${sessionId}/photos`)
      .set(as(token))
      .attach('file', file, name);

  beforeAll(async () => {
    ctx = await createTestApp();
    archer = await signUp('ph-archer');
    otherArcher = await signUp('ph-other');
    journalId = (
      await http()
        .post('/api/v1/journals')
        .set(as(archer))
        .send({ title: 'Saison', startDate: '2026-09-01', endDate: '2027-08-31' })
        .expect(201)
    ).body.id;
    picture = await sharp({
      create: { width: 3000, height: 1500, channels: 3, background: '#3399cc' },
    })
      .withExif({ IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '48/1 51/1 0/1' } })
      .jpeg()
      .toBuffer();
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('stores a resized copy without metadata, lists it and deletes it', async () => {
    expect((await sharp(picture).metadata()).exif).toBeDefined();
    const sessionId = await createSession();

    const added = await upload(sessionId, picture).expect(201);
    expect(added.body).toMatchObject({ width: 2000, height: 1000 });
    expect(added.body.url).toContain(`${sessionId}/${added.body.id}.webp`);
    expect(added.body.thumbnailUrl).toContain(`${added.body.id}-thumb.webp`);

    const keys = [...ctx.files.keys()].filter((key) => key.includes(sessionId));
    expect(keys).toHaveLength(2);
    const stored = await sharp(ctx.files.get(keys.find((k) => !k.includes('thumb'))!)).metadata();
    expect(stored).toMatchObject({ format: 'webp', width: 2000, height: 1000 });
    expect(stored.exif).toBeUndefined();
    const thumb = await sharp(ctx.files.get(keys.find((k) => k.includes('thumb'))!)).metadata();
    expect(thumb.width).toBe(400);

    // Any type of event takes photos.
    const training = await createSession('TRAINING');
    await upload(training, picture).expect(201);

    const list = await http()
      .get(`/api/v1/journal/sessions/${sessionId}/photos`)
      .set(as(archer))
      .expect(200);
    expect(list.body).toEqual([expect.objectContaining({ id: added.body.id })]);

    // Private to the archer.
    await http()
      .get(`/api/v1/journal/sessions/${sessionId}/photos`)
      .set(as(otherArcher))
      .expect(404);
    await upload(sessionId, picture, otherArcher).expect(404);
    await http()
      .delete(`/api/v1/journal/sessions/${sessionId}/photos/${added.body.id}`)
      .set(as(otherArcher))
      .expect(404);

    await http()
      .delete(`/api/v1/journal/sessions/${sessionId}/photos/${added.body.id}`)
      .set(as(archer))
      .expect(204);
    expect([...ctx.files.keys()].filter((key) => key.includes(sessionId))).toEqual([]);
    await http()
      .delete(`/api/v1/journal/sessions/${sessionId}/photos/${added.body.id}`)
      .set(as(archer))
      .expect(404);
  });

  it('rejects what is not a small enough image, and caps the number of photos', async () => {
    const sessionId = await createSession();

    const text = await upload(sessionId, Buffer.from('not an image'), archer, 'notes.txt');
    expect(text.status).toBe(400);
    expect(text.body.code).toBe('INVALID_IMAGE');
    const gif = await upload(sessionId, await sharp(picture).gif().toBuffer(), archer, 'a.gif');
    expect(gif.body.code).toBe('INVALID_IMAGE');
    const none = await http()
      .post(`/api/v1/journal/sessions/${sessionId}/photos`)
      .set(as(archer))
      .expect(400);
    expect(none.body.code).toBe('INVALID_IMAGE');

    const huge = await upload(sessionId, Buffer.alloc(10 * 1024 * 1024 + 1));
    expect(huge.status).toBe(413);
    expect(huge.body.code).toBe('FILE_TOO_LARGE');

    const small = await sharp(picture).resize(200).jpeg().toBuffer();
    for (let i = 0; i < 10; i++) await upload(sessionId, small).expect(201);
    const eleventh = await upload(sessionId, small).expect(409);
    expect(eleventh.body.code).toBe('LIMIT_REACHED');
    // A small picture is not enlarged.
    const list = await http()
      .get(`/api/v1/journal/sessions/${sessionId}/photos`)
      .set(as(archer))
      .expect(200);
    expect(list.body).toHaveLength(10);
    expect(list.body[0]).toMatchObject({ width: 200, height: 100 });
  });

  it('deletes the files with their event and with their journal', async () => {
    const sessionId = await createSession();
    await upload(sessionId, picture).expect(201);
    const mine = () => [...ctx.files.keys()].filter((key) => key.includes(sessionId));
    expect(mine()).toHaveLength(2);
    await http().delete(`/api/v1/journal/sessions/${sessionId}`).set(as(archer)).expect(204);
    expect(mine()).toEqual([]);

    const other = await createSession();
    await upload(other, picture).expect(201);
    expect(ctx.files.size).toBeGreaterThan(0);
    await http().delete(`/api/v1/journals/${journalId}`).set(as(archer)).expect(204);
    expect(ctx.files.size).toBe(0);
  });
});
