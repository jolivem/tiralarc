import * as argon2 from 'argon2';
import sharp from 'sharp';
import request from 'supertest';
import { createTestApp, fakeIdToken, type TestContext } from './helpers.js';

/** The files of a ZIP archive (stored entries), read through its central directory. */
function unzip(archive: Buffer): Map<string, Buffer> {
  const end = archive.length - 22;
  const count = archive.readUInt16LE(end + 10);
  let at = archive.readUInt32LE(end + 16);
  const files = new Map<string, Buffer>();
  for (let i = 0; i < count; i++) {
    const nameLength = archive.readUInt16LE(at + 28);
    const name = archive.subarray(at + 46, at + 46 + nameLength).toString('utf8');
    const local = archive.readUInt32LE(at + 42);
    const start = local + 30 + archive.readUInt16LE(local + 26);
    files.set(name, archive.subarray(start, start + archive.readUInt32LE(local + 22)));
    at += 46 + nameLength;
  }
  return files;
}

const binary = (res: request.Response, done: (error: Error | null, body: Buffer) => void) => {
  const chunks: Buffer[] = [];
  res.on('data', (chunk: Buffer) => chunks.push(chunk));
  res.on('end', () => done(null, Buffer.concat(chunks)));
};

describe('Account deletion and data export (e2e)', () => {
  let ctx: TestContext;
  const http = () => request(ctx.app.getHttpServer());
  const as = (token: string) => ({ Authorization: `Bearer ${token}` });
  const signUp = async (sub: string) =>
    (
      await http()
        .post('/api/v1/auth/google')
        .send({ idToken: fakeIdToken(sub, `${sub}@gmail.com`) })
        .expect(200)
    ).body.accessToken as string;

  /** An archer with a journal, a training with a photo, and a goal. */
  const archerWithData = async (sub: string) => {
    const token = await signUp(sub);
    await http()
      .post('/api/v1/journals')
      .set(as(token))
      .send({ title: 'Saison 2026-2027', startDate: '2026-09-01', endDate: '2027-08-31' })
      .expect(201);
    const session = (
      await http()
        .post('/api/v1/journal/sessions')
        .set(as(token))
        .send({ type: 'TRAINING', date: '2026-10-10', location: 'gymnase' })
        .expect(201)
    ).body.id as string;
    const picture = await sharp({
      create: { width: 40, height: 30, channels: 3, background: '#3399cc' },
    })
      .jpeg()
      .toBuffer();
    const photo = (
      await http()
        .post(`/api/v1/journal/sessions/${session}/photos`)
        .set(as(token))
        .attach('file', picture, 'photo.jpg')
        .expect(201)
    ).body.id as string;
    await http()
      .post('/api/v1/goals')
      .set(as(token))
      .send({ type: 'SPORT', description: '550 en salle', createdOn: '2026-09-15' })
      .expect(201);
    return { token, session, photo };
  };

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('exports the data as a ZIP archive: the JSON, then the photos', async () => {
    const { token, session, photo } = await archerWithData('acc-export');
    const res = await http()
      .get('/api/v1/users/me/export')
      .set(as(token))
      .buffer(true)
      .parse(binary)
      .expect(200)
      .expect('content-type', 'application/zip');
    expect(res.headers['content-disposition']).toMatch(/attachment; filename="myarcherydiary-/);
    const files = unzip(res.body as Buffer);
    const data = JSON.parse(files.get('mes-donnees.json')!.toString('utf8'));
    expect(data.account.email).toBe('acc-export@gmail.com');
    expect(data.journals).toEqual([expect.objectContaining({ title: 'Saison 2026-2027' })]);
    expect(data.goals).toEqual([expect.objectContaining({ description: '550 en salle' })]);
    const path = `photos/2026-10-10_${session}/${photo}.webp`;
    expect(data.events).toEqual([
      expect.objectContaining({
        id: session,
        type: 'TRAINING',
        date: '2026-10-10',
        photos: [path],
      }),
    ]);
    expect((await sharp(files.get(path)!).metadata()).format).toBe('webp');
  });

  it('deletes an account once its email is typed again, with its photos', async () => {
    const { token } = await archerWithData('acc-delete');
    const user = await ctx.prisma.user.findUniqueOrThrow({
      where: { email: 'acc-delete@gmail.com' },
    });
    expect([...ctx.files.keys()].some((key) => key.startsWith(`${user.id}/`))).toBe(true);

    await http()
      .delete('/api/v1/users/me')
      .set(as(token))
      .send({ email: 'someone@else.com' })
      .expect(400);
    await http()
      .delete('/api/v1/users/me')
      .set(as(token))
      .send({ email: 'ACC-DELETE@gmail.com' })
      .expect(204);

    expect(await ctx.prisma.user.findUnique({ where: { id: user.id } })).toBeNull();
    expect(await ctx.prisma.journalSession.count({ where: { userId: user.id } })).toBe(0);
    expect([...ctx.files.keys()].some((key) => key.startsWith(`${user.id}/`))).toBe(false);
  });

  it('asks for the password of an account that has one', async () => {
    const token = await signUp('acc-password');
    await ctx.prisma.user.update({
      where: { email: 'acc-password@gmail.com' },
      data: { passwordHash: await argon2.hash('correct horse battery') },
    });
    const confirm = (password?: string) =>
      http()
        .delete('/api/v1/users/me')
        .set(as(token))
        .send({ email: 'acc-password@gmail.com', password });
    expect((await confirm().expect(401)).body.code).toBe('INVALID_CREDENTIALS');
    await confirm('wrong password').expect(401);
    await confirm('correct horse battery').expect(204);
  });
});
