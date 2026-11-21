import request from 'supertest';
import { NotificationsService } from '../src/notifications/notifications.service.js';
import { createTestApp, fakeIdToken, type TestContext } from './helpers.js';

const DAY_MS = 86_400_000;
const day = (time: number) =>
  new Date(`${new Date(time).toISOString().slice(0, 10)}T00:00:00.000Z`);

describe('Archers’ emails: coach news, competition reminders (e2e)', () => {
  let ctx: TestContext;
  let notifications: NotificationsService;
  const http = () => request(ctx.app.getHttpServer());
  const as = (token: string) => ({ Authorization: `Bearer ${token}` });
  const signUp = async (sub: string) => {
    const token = (
      await http()
        .post('/api/v1/auth/google')
        .send({ idToken: fakeIdToken(sub, `${sub}@gmail.com`) })
        .expect(200)
    ).body.accessToken as string;
    const user = await ctx.prisma.user.findUniqueOrThrow({ where: { email: `${sub}@gmail.com` } });
    await ctx.prisma.user.update({ where: { id: user.id }, data: { displayName: sub } });
    return { token, id: user.id, email: user.email };
  };
  /** 10:00 UTC today: past the first hour emails go out. */
  const now = () => new Date(`${new Date().toISOString().slice(0, 10)}T10:00:00.000Z`);
  const mailsTo = (email: string) => ctx.outbox.filter((m) => m.to === email);

  beforeAll(async () => {
    ctx = await createTestApp();
    notifications = ctx.app.get(NotificationsService);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('tells the archer what their coach proposed and wrote, once a day at most, unless turned off', async () => {
    const archer = await signUp('nt-archer');
    const coach = await signUp('nt-coach');
    const at = now();
    const planned = await ctx.prisma.journalSession.create({
      data: {
        userId: archer.id,
        type: 'TRAINING',
        date: day(at.getTime() + 3 * DAY_MS),
        plannedById: coach.id,
        wentWell: [],
        toImprove: [],
      },
    });
    const past = await ctx.prisma.journalSession.create({
      data: {
        userId: archer.id,
        type: 'COMPETITION',
        date: day(at.getTime() - 2 * DAY_MS),
        wentWell: [],
        toImprove: [],
      },
    });
    await ctx.prisma.sessionComment.create({
      data: { sessionId: past.id, coachId: coach.id, text: 'Bravo' },
    });

    await notifications.run(at);
    const [mail] = mailsTo(archer.email);
    expect(mail?.subject).toBe('Du nouveau de nt-coach dans votre journal');
    expect(mail?.text).toContain('Entraînement proposé(e)');
    expect(mail?.text).toContain('Commentaire de nt-coach');

    // Something new the same day: it waits for tomorrow.
    await ctx.prisma.sessionComment.updateMany({
      data: { text: 'Bravo !', updatedAt: new Date(at.getTime() + 60_000) },
    });
    await notifications.run(new Date(at.getTime() + 2 * 3_600_000));
    expect(mailsTo(archer.email)).toHaveLength(1);
    await notifications.run(new Date(at.getTime() + DAY_MS + 3_600_000));
    expect(mailsTo(archer.email)).toHaveLength(2);
    // Nothing new since: no email.
    await notifications.run(new Date(at.getTime() + 2 * DAY_MS + 3_600_000));
    expect(mailsTo(archer.email)).toHaveLength(2);

    // Turned off on the Profile page.
    await http()
      .patch('/api/v1/profile')
      .set(as(archer.token))
      .send({ coachEmails: false })
      .expect(200);
    await ctx.prisma.journalSession.update({
      where: { id: planned.id },
      data: { createdAt: new Date(at.getTime() + 2 * DAY_MS + 7_200_000) },
    });
    await notifications.run(new Date(at.getTime() + 4 * DAY_MS));
    expect(mailsTo(archer.email)).toHaveLength(2);
    expect(
      (await http().get('/api/v1/profile').set(as(archer.token)).expect(200)).body,
    ).toMatchObject({
      coachEmails: false,
      competitionReminders: true,
    });
  });

  it('reminds the archer of their competitions of the coming week, once each', async () => {
    const archer = await signUp('nt-competitor');
    const at = now();
    const created = new Date(at.getTime() - 10 * DAY_MS);
    const soon = await ctx.prisma.journalSession.create({
      data: {
        userId: archer.id,
        type: 'COMPETITION',
        date: day(at.getTime() + 4 * DAY_MS),
        location: 'Rennes',
        fftaCompetitionId: '12345',
        createdAt: created,
        wentWell: [],
        toImprove: [],
      },
    });
    // Too far, just added, or not a competition: no reminder.
    await ctx.prisma.journalSession.createMany({
      data: [
        {
          userId: archer.id,
          type: 'COMPETITION',
          date: day(at.getTime() + 12 * DAY_MS),
          createdAt: created,
          wentWell: [],
          toImprove: [],
        },
        {
          userId: archer.id,
          type: 'COMPETITION',
          date: day(at.getTime() + 2 * DAY_MS),
          wentWell: [],
          toImprove: [],
        },
        {
          userId: archer.id,
          type: 'TRAINING',
          date: day(at.getTime() + 2 * DAY_MS),
          createdAt: created,
          wentWell: [],
          toImprove: [],
        },
      ],
    });

    await notifications.run(at);
    const mails = mailsTo(archer.email);
    expect(mails).toHaveLength(1);
    expect(mails[0]!.subject).toBe('Votre concours de la semaine');
    expect(mails[0]!.text).toContain('Rennes');
    expect(mails[0]!.text).toContain('https://www.ffta.fr/epreuve/12345');
    expect(mails[0]!.text).toContain(`/fr/archer/journal/${soon.id}`);

    await notifications.run(new Date(at.getTime() + 3_600_000));
    expect(mailsTo(archer.email)).toHaveLength(1);
  });
});
