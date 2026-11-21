import request from 'supertest';
import { createTestApp, fakeIdToken, type TestContext } from './helpers.js';

const today = () => new Date().toISOString().slice(0, 10);
const daysFromToday = (n: number) =>
  new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

describe('Weather, calendar link and figured goals (e2e)', () => {
  let ctx: TestContext;
  let token: string;
  const http = () => request(ctx.app.getHttpServer());
  const as = () => ({ Authorization: `Bearer ${token}` });
  const createSession = async (body: Record<string, unknown>) =>
    (await http().post('/api/v1/journal/sessions').set(as()).send(body).expect(201)).body
      .id as string;

  beforeAll(async () => {
    ctx = await createTestApp();
    token = (
      await http()
        .post('/api/v1/auth/google')
        .send({ idToken: fakeIdToken('extras', 'extras@gmail.com') })
        .expect(200)
    ).body.accessToken;
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it("looks the day's weather up at the event's town, else the home town", async () => {
    ctx.address.towns.set('|Rennes', { latitude: 48.11, longitude: -1.68 });
    const atRennes = await createSession({ type: 'TRAINING', date: today(), location: 'Rennes' });
    const weather = await http()
      .get(`/api/v1/journal/sessions/${atRennes}/weather`)
      .set(as())
      .expect(200);
    expect(weather.body).toEqual({
      sky: 'PARTLY_CLOUDY',
      wind: 'LIGHT',
      temperatureC: 18,
      place: 'Rennes',
    });
    expect(ctx.weather.requests.at(-1)).toBe(`forecast:48.11,-1.68:${today()}`);

    const atClub = await createSession({
      type: 'TRAINING',
      date: daysFromToday(-1),
      location: 'Gymnase du club',
    });
    const none = await http()
      .get(`/api/v1/journal/sessions/${atClub}/weather`)
      .set(as())
      .expect(422);
    expect(none.body.code).toBe('WEATHER_UNAVAILABLE');
    ctx.address.towns.set('|Vitré', { latitude: 48.12, longitude: -1.2 });
    await http().patch('/api/v1/profile').set(as()).send({ homeTown: 'Vitré' }).expect(200);
    const atHome = await http()
      .get(`/api/v1/journal/sessions/${atClub}/weather`)
      .set(as())
      .expect(200);
    expect(atHome.body.place).toBe('Vitré');

    const future = await createSession({ type: 'TRAINING', date: daysFromToday(3) });
    await http().get(`/api/v1/journal/sessions/${future}/weather`).set(as()).expect(400);
    ctx.weather.weather = undefined;
    await http().get(`/api/v1/journal/sessions/${atRennes}/weather`).set(as()).expect(422);
  });

  it('serves the events to calendar apps through a secret link, which can be renewed or turned off', async () => {
    await createSession({ type: 'COMPETITION', date: daysFromToday(10), location: 'Saint-Malo' });
    const { url } = (await http().post('/api/v1/profile/calendar-feed').set(as()).expect(201)).body;
    const path = new URL(url).pathname;
    expect(path).toMatch(/^\/api\/v1\/calendar\/[\w-]+\.ics$/);
    expect((await http().get('/api/v1/profile').set(as())).body.hasCalendarFeed).toBe(true);

    const feed = await http()
      .get(path)
      .expect(200)
      .expect('content-type', /text\/calendar/);
    expect(feed.text).toContain('BEGIN:VCALENDAR');
    // Places read with a capital first, the rest in lower case (`placeName`).
    expect(feed.text).toContain('SUMMARY:Compétition · Saint-malo');
    expect(feed.text).toContain(`DTSTART;VALUE=DATE:${daysFromToday(10).replaceAll('-', '')}`);

    const renewed = (await http().post('/api/v1/profile/calendar-feed').set(as()).expect(201)).body
      .url;
    await http().get(path).expect(404);
    await http().delete('/api/v1/profile/calendar-feed').set(as()).expect(204);
    await http().get(new URL(renewed).pathname).expect(404);
    await http().get('/api/v1/calendar/nope.ics').expect(404);
  });

  it('follows a figured goal and marks it reached on the day its target was met', async () => {
    const start = daysFromToday(-20);
    const goal = (
      await http()
        .post('/api/v1/goals')
        .set(as())
        .send({
          type: 'SPORT',
          description: '550 en salle',
          createdOn: start,
          metric: 'SCORE',
          target: 550,
          discipline: 'INDOOR',
          distanceMeters: 18,
        })
        .expect(201)
    ).body;
    expect(goal).toMatchObject({ metric: 'SCORE', target: 550, progress: 0, achieved: false });

    const scored = await createSession({ type: 'COMPETITION', date: daysFromToday(-10) });
    await http()
      .patch(`/api/v1/journal/sessions/${scored}`)
      .set(as())
      .send({ discipline: 'INDOOR', distanceMeters: 18, score: 552, arrowCount: 60 })
      .expect(200);

    const [read] = (await http().get('/api/v1/goals').set(as()).expect(200)).body;
    expect(read).toMatchObject({ progress: 552, achieved: true, achievedOn: daysFromToday(-10) });

    await http()
      .post('/api/v1/goals')
      .set(as())
      .send({ type: 'SPORT', description: 'x', metric: 'ARROWS' })
      .expect(400);
  });
});
