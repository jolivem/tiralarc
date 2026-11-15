import request from 'supertest';
import { createTestApp, fakeIdToken, type TestContext } from './helpers.js';

describe('Reviews (e2e)', () => {
  let ctx: TestContext;
  let user: string;

  const http = () => request(ctx.app.getHttpServer());
  const as = (token: string) => ({ Authorization: `Bearer ${token}` });
  /** The moderation link's token, from the last mail to the moderators. */
  const moderationToken = () => {
    const mail = ctx.outbox.at(-1);
    expect(mail?.to).toBe('feedback@myarcherydiary.com');
    return new URL(mail!.text.match(/https?:\/\/\S+/)![0]).searchParams.get('token')!;
  };

  beforeAll(async () => {
    ctx = await createTestApp();
    user = (
      await http()
        .post('/api/v1/auth/google')
        .send({ idToken: fakeIdToken('r-user', 'r-user@gmail.com', true, 'Camille Dupré') })
        .expect(200)
    ).body.accessToken as string;
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('emails a review for approval, then shows it once published; one a day', async () => {
    const before = await http().get('/api/v1/reviews/mine').set(as(user)).expect(200);
    expect(before.body).toEqual({ last: null, nextAllowedAt: null });

    const created = await http()
      .post('/api/v1/reviews')
      .set(as(user))
      .send({ stars: 5, comment: '  Super carnet !  ' })
      .expect(201);
    expect(created.body.last).toMatchObject({
      stars: 5,
      comment: 'Super carnet !',
      status: 'PENDING',
    });
    expect(created.body.nextAllowedAt).not.toBeNull();
    const mail = ctx.outbox.at(-1)!;
    expect(mail.subject).toBe('Nouvel avis ★★★★★ de Camille D.');
    expect(mail.text).toContain('Super carnet !');
    expect(mail.text).toContain('r-user@gmail.com');

    // Not shown until approved.
    expect((await http().get('/api/v1/reviews').expect(200)).body).toEqual([]);
    // One a day.
    const again = await http()
      .post('/api/v1/reviews')
      .set(as(user))
      .send({ stars: 4, comment: 'Encore' })
      .expect(429);
    expect(again.body.code).toBe('DAILY_LIMIT_REACHED');

    // The emailed link: shows the review, then publishes it, once.
    const token = moderationToken();
    const seen = await http().get(`/api/v1/reviews/moderation?token=${token}`).expect(200);
    expect(seen.body).toMatchObject({ stars: 5, authorName: 'Camille D.', status: 'PENDING' });
    await http()
      .post('/api/v1/reviews/moderation')
      .send({ token, decision: 'PUBLISH' })
      .expect(204);
    const twice = await http()
      .post('/api/v1/reviews/moderation')
      .send({ token, decision: 'REFUSE' })
      .expect(409);
    expect(twice.body.code).toBe('INVALID_REVIEW_TOKEN');
    await http()
      .post('/api/v1/reviews/moderation')
      .send({ token: 'not-a-real-token', decision: 'PUBLISH' })
      .expect(409);

    const shown = await http().get('/api/v1/reviews').expect(200);
    expect(shown.body).toEqual([
      expect.objectContaining({ stars: 5, comment: 'Super carnet !', authorName: 'Camille D.' }),
    ]);
    // Neither the email nor the user's id shows.
    expect(JSON.stringify(shown.body)).not.toContain('r-user');

    // A day later, another one may be written; refused, it never shows.
    await ctx.prisma.appReview.updateMany({
      data: { createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000) },
    });
    await http()
      .post('/api/v1/reviews')
      .set(as(user))
      .send({ stars: 2, comment: 'Bof' })
      .expect(201);
    await http()
      .post('/api/v1/reviews/moderation')
      .send({ token: moderationToken(), decision: 'REFUSE' })
      .expect(204);
    expect((await http().get('/api/v1/reviews').expect(200)).body).toHaveLength(1);
  });

  it('validates the stars and the comment, and needs to be signed in to write', async () => {
    await http().post('/api/v1/reviews').send({ stars: 5, comment: 'x' }).expect(401);
    await http().post('/api/v1/reviews').set(as(user)).send({ stars: 6, comment: 'x' }).expect(400);
    await http().post('/api/v1/reviews').set(as(user)).send({ stars: 3, comment: '' }).expect(400);
  });
});
