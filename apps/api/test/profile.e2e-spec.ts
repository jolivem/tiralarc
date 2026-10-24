import request from 'supertest';
import { createTestApp, dropRoles, fakeIdToken, type TestContext } from './helpers.js';

describe('Profile (e2e)', () => {
  let ctx: TestContext;
  let archer: string;
  let otherArcher: string;
  let coach: string;

  const http = () => request(ctx.app.getHttpServer());
  const as = (token: string) => ({ Authorization: `Bearer ${token}` });
  const signUp = async (sub: string) =>
    (
      await http()
        .post('/api/v1/auth/google')
        .send({ idToken: fakeIdToken(sub, `${sub}@gmail.com`, true, 'Léa Archère') })
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
    archer = await signUp('p-archer');
    otherArcher = await signUp('p-other');
    // Not an archer (every new account is one: its role is taken away).
    await signUp('p-coach');
    await dropRoles(ctx.prisma, 'p-coach@gmail.com');
    coach = await signUp('p-coach');
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
      calendarFont: null,
      favoriteIndicator: null,
      department: null,
      paraCompetitions: false,
    });

    const saved = await http()
      .patch('/api/v1/profile')
      .set(as(archer))
      .send({
        licenceNumber: ' 0123456A ',
        category: 'S1',
        bowType: 'RECURVE',
        disciplines: ['INDOOR', 'BEURSAULT', 'RUN_ARCHERY'],
        calendarFont: 'great-vibes',
        favoriteIndicator: 'DURATIONS',
        department: '2A',
        paraCompetitions: true,
      })
      .expect(200);
    expect(saved.body).toEqual({
      licenceNumber: '0123456A',
      category: 'S1',
      bowType: 'RECURVE',
      disciplines: ['INDOOR', 'BEURSAULT', 'RUN_ARCHERY'],
      calendarFont: 'great-vibes',
      favoriteIndicator: 'DURATIONS',
      department: '2A',
      paraCompetitions: true,
    });

    // Partial update; null clears a field.
    const cleared = await http()
      .patch('/api/v1/profile')
      .set(as(archer))
      .send({ category: null, disciplines: [], calendarFont: null, favoriteIndicator: null })
      .expect(200);
    expect(cleared.body).toMatchObject({
      category: null,
      bowType: 'RECURVE',
      disciplines: [],
      calendarFont: null,
      favoriteIndicator: null,
    });

    const bad = await http()
      .patch('/api/v1/profile')
      .set(as(archer))
      .send({
        category: 'U99',
        bowType: 'CROSSBOW',
        disciplines: ['INDOOR', 'INDOOR'],
        calendarFont: 'Comic Sans!',
        favoriteIndicator: 'GOALS',
      })
      .expect(400);
    expect(bad.body.errors.map((e: { field: string }) => e.field).sort()).toEqual([
      'bowType',
      'calendarFont',
      'category',
      'disciplines',
      'favoriteIndicator',
    ]);

    // Each archer has their own profile.
    const other = await http().get('/api/v1/profile').set(as(otherArcher)).expect(200);
    expect(other.body.bowType).toBeNull();
    // A first save may carry a single field (e.g. the Personalisation card's font).
    const first = await http()
      .patch('/api/v1/profile')
      .set(as(otherArcher))
      .send({ calendarFont: 'satisfy' })
      .expect(200);
    expect(first.body).toMatchObject({ disciplines: [], calendarFont: 'satisfy' });
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
      coachAccess: 'READ',
      status: 'PENDING',
    });
    const mail = ctx.outbox.find((m) => m.to === 'camille@example.com');
    expect(mail?.subject).toBe('Léa Archère vous invite comme coach sur Tiralarc');

    const again = await http()
      .post('/api/v1/profile/invitations')
      .set(as(archer))
      .send({ name: 'Camille', email: 'camille@example.com' })
      .expect(409);
    expect(again.body.code).toBe('INVITATION_ALREADY_SENT');
    const myself = await http()
      .post('/api/v1/profile/invitations')
      .set(as(archer))
      .send({ name: 'Moi', email: 'p-archer@gmail.com' })
      .expect(400);
    expect(myself.body.code).toBe('CANNOT_INVITE_SELF');
    await http()
      .post('/api/v1/profile/invitations')
      .set(as(archer))
      .send({ name: ' ', email: 'pas-un-email' })
      .expect(400);

    // A plain guest accepts without an account; a second click is harmless.
    const guest = await http()
      .post('/api/v1/profile/invitations')
      .set(as(archer))
      .send({
        name: 'Dominique',
        email: 'dominique@example.com',
        coachAccess: 'WRITE',
        // The email in the guest's language, not the archer's (French).
        locale: 'en',
      })
      .expect(201);
    expect(guest.body).toMatchObject({ isCoach: false, coachAccess: null });
    const guestMail = ctx.outbox.find((m) => m.to === 'dominique@example.com');
    expect(guestMail?.subject).toBe('Léa Archère invites you to Tiralarc');
    expect(guestMail?.text).toContain('/en/invitations/accept?token=');
    await http()
      .post('/api/v1/profile/invitations')
      .set(as(archer))
      .send({ name: 'X', email: 'x@example.com', locale: 'de' })
      .expect(400);
    const guestToken = invitationToken('dominique@example.com');
    const accepted = await http()
      .post('/api/v1/invitations/accept')
      .send({ token: guestToken })
      .expect(200);
    expect(accepted.body).toEqual({ invitedBy: 'Léa Archère', archerId: null });
    await http().post('/api/v1/invitations/accept').send({ token: guestToken }).expect(200);
    await http()
      .patch(`/api/v1/profile/invitations/${guest.body.id}`)
      .set(as(archer))
      .send({ coachAccess: 'WRITE' })
      .expect(400);
    await http().delete(`/api/v1/profile/invitations/${guest.body.id}`).set(as(archer)).expect(204);

    // A coach must be signed in (that account becomes the coach), and not be the archer.
    const token = invitationToken('camille@example.com');
    const anonymous = await http().post('/api/v1/invitations/accept').send({ token }).expect(401);
    expect(anonymous.body.code).toBe('SIGN_IN_REQUIRED');
    const self = await http()
      .post('/api/v1/invitations/accept')
      .set(as(archer))
      .send({ token })
      .expect(400);
    expect(self.body.code).toBe('CANNOT_INVITE_SELF');
    const coached = await http()
      .post('/api/v1/invitations/accept')
      .set(as(coach))
      .send({ token })
      .expect(200);
    expect(coached.body).toEqual({ invitedBy: 'Léa Archère', archerId: expect.any(String) });
    await http().post('/api/v1/invitations/accept').set(as(coach)).send({ token }).expect(200);
    // Used: nobody else can take it.
    await http()
      .post('/api/v1/invitations/accept')
      .set(as(otherArcher))
      .send({ token })
      .expect(400);

    // The archer changes the coach's access.
    const writable = await http()
      .patch(`/api/v1/profile/invitations/${invited.body.id}`)
      .set(as(archer))
      .send({ coachAccess: 'WRITE' })
      .expect(200);
    expect(writable.body.coachAccess).toBe('WRITE');
    await http()
      .patch(`/api/v1/profile/invitations/${invited.body.id}`)
      .set(as(otherArcher))
      .send({ coachAccess: 'READ' })
      .expect(404);
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
    await http().post('/api/v1/invitations/accept').set(as(coach)).send({ token }).expect(400);
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
