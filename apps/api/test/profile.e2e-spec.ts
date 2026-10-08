import request from 'supertest';
import { createTestApp, fakeIdToken, type TestContext } from './helpers.js';

describe('Profile (e2e)', () => {
  let ctx: TestContext;
  let archer: string;
  let otherArcher: string;
  let coach: string;

  const http = () => request(ctx.app.getHttpServer());
  const as = (token: string) => ({ Authorization: `Bearer ${token}` });
  const signUp = async (sub: string, roles: string[]) =>
    (
      await http()
        .post('/api/v1/auth/google')
        .send({ idToken: fakeIdToken(sub, `${sub}@gmail.com`, true, 'Léa Archère'), roles })
        .expect(200)
    ).body.accessToken as string;
  /** Token of the last invitation emailed to `to`. */
  const invitationToken = (to: string) => {
    const mail = ctx.outbox.filter((m) => m.to === to).at(-1);
    const token = mail?.text.match(/invitations\/accept\?token=([\w-]+)/)?.[1];
    if (!token) throw new Error(`No invitation email for ${to}`);
    return token;
  };

  beforeAll(async () => {
    ctx = await createTestApp();
    archer = await signUp('p-archer', ['ARCHER']);
    otherArcher = await signUp('p-other', ['ARCHER']);
    coach = await signUp('p-coach', ['COACH']);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('reads and updates the sport details', async () => {
    const empty = await http().get('/api/v1/profile').set(as(archer)).expect(200);
    expect(empty.body).toEqual({
      licenceNumber: null,
      category: null,
      bowType: null,
      disciplines: [],
    });

    const saved = await http()
      .patch('/api/v1/profile')
      .set(as(archer))
      .send({
        licenceNumber: ' 0123456A ',
        category: 'S1',
        bowType: 'RECURVE',
        disciplines: ['INDOOR', 'BEURSAULT', 'RUN_ARCHERY'],
      })
      .expect(200);
    expect(saved.body).toEqual({
      licenceNumber: '0123456A',
      category: 'S1',
      bowType: 'RECURVE',
      disciplines: ['INDOOR', 'BEURSAULT', 'RUN_ARCHERY'],
    });

    // Partial update; null clears a field.
    const cleared = await http()
      .patch('/api/v1/profile')
      .set(as(archer))
      .send({ category: null, disciplines: [] })
      .expect(200);
    expect(cleared.body).toMatchObject({ category: null, bowType: 'RECURVE', disciplines: [] });

    const bad = await http()
      .patch('/api/v1/profile')
      .set(as(archer))
      .send({ category: 'U99', bowType: 'CROSSBOW', disciplines: ['INDOOR', 'INDOOR'] })
      .expect(400);
    expect(bad.body.errors.map((e: { field: string }) => e.field).sort()).toEqual([
      'bowType',
      'category',
      'disciplines',
    ]);

    // Each archer has their own profile.
    const other = await http().get('/api/v1/profile').set(as(otherArcher)).expect(200);
    expect(other.body.bowType).toBeNull();
  });

  it('invites people by email and lets them accept', async () => {
    const invited = await http()
      .post('/api/v1/profile/invitations')
      .set(as(archer))
      .send({ name: ' Camille Martin ', email: 'Camille@Example.com', isCoach: true })
      .expect(201);
    expect(invited.body).toMatchObject({
      name: 'Camille Martin',
      email: 'camille@example.com',
      isCoach: true,
      status: 'PENDING',
    });
    const mail = ctx.outbox.find((m) => m.to === 'camille@example.com');
    expect(mail?.subject).toBe('Léa Archère vous invite sur Tiralarc');

    const again = await http()
      .post('/api/v1/profile/invitations')
      .set(as(archer))
      .send({ name: 'Camille', email: 'camille@example.com' })
      .expect(409);
    expect(again.body.code).toBe('INVITATION_ALREADY_SENT');
    const self = await http()
      .post('/api/v1/profile/invitations')
      .set(as(archer))
      .send({ name: 'Moi', email: 'p-archer@gmail.com' })
      .expect(400);
    expect(self.body.code).toBe('CANNOT_INVITE_SELF');
    await http()
      .post('/api/v1/profile/invitations')
      .set(as(archer))
      .send({ name: ' ', email: 'pas-un-email' })
      .expect(400);

    // The guest accepts without an account; a second click is harmless.
    const token = invitationToken('camille@example.com');
    const accepted = await http().post('/api/v1/invitations/accept').send({ token }).expect(200);
    expect(accepted.body).toEqual({ invitedBy: 'Léa Archère' });
    await http().post('/api/v1/invitations/accept').send({ token }).expect(200);
    const invalid = await http()
      .post('/api/v1/invitations/accept')
      .send({ token: 'nope' })
      .expect(400);
    expect(invalid.body.code).toBe('INVALID_INVITATION_TOKEN');

    const list = await http().get('/api/v1/profile/invitations').set(as(archer)).expect(200);
    expect(list.body).toEqual([
      expect.objectContaining({ id: invited.body.id, status: 'ACCEPTED' }),
    ]);

    // Private to the archer; removing withdraws the invitation.
    expect(
      (await http().get('/api/v1/profile/invitations').set(as(otherArcher)).expect(200)).body,
    ).toEqual([]);
    await http()
      .delete(`/api/v1/profile/invitations/${invited.body.id}`)
      .set(as(otherArcher))
      .expect(404);
    await http()
      .delete(`/api/v1/profile/invitations/${invited.body.id}`)
      .set(as(archer))
      .expect(204);
    await http().post('/api/v1/invitations/accept').send({ token }).expect(400);
  });

  it('manages favourite websites', async () => {
    const site = await http()
      .post('/api/v1/profile/sites')
      .set(as(archer))
      .send({ label: ' FFTA ', url: 'https://www.ffta.fr' })
      .expect(201);
    expect(site.body).toEqual({ id: site.body.id, label: 'FFTA', url: 'https://www.ffta.fr' });

    for (const url of ['ffta.fr', 'javascript:alert(1)', 'ftp://ffta.fr']) {
      await http()
        .post('/api/v1/profile/sites')
        .set(as(archer))
        .send({ label: 'Bad', url })
        .expect(400);
    }

    expect((await http().get('/api/v1/profile/sites').set(as(archer)).expect(200)).body).toEqual([
      site.body,
    ]);
    expect(
      (await http().get('/api/v1/profile/sites').set(as(otherArcher)).expect(200)).body,
    ).toEqual([]);
    await http().delete(`/api/v1/profile/sites/${site.body.id}`).set(as(otherArcher)).expect(404);
    await http().delete(`/api/v1/profile/sites/${site.body.id}`).set(as(archer)).expect(204);
    await http().delete(`/api/v1/profile/sites/${site.body.id}`).set(as(archer)).expect(404);
  });

  it('is reserved to archers', async () => {
    await http().get('/api/v1/profile').set(as(coach)).expect(403);
    await http().get('/api/v1/profile/invitations').set(as(coach)).expect(403);
    await http().get('/api/v1/profile/sites').set(as(coach)).expect(403);
    await http().get('/api/v1/profile').expect(401);
  });
});
