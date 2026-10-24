import request from 'supertest';
import type { FftaRankingInfo } from '../src/competitions/ffta-rankings.js';
import { createTestApp, fakeIdToken, type TestContext } from './helpers.js';

const ranking = (id: string, extra: Partial<FftaRankingInfo> = {}): FftaRankingInfo => ({
  id,
  name: `Senior 2 Femme Arc Classique 2027 (${id})`,
  distance: null,
  sex: 'F',
  bow: 'RECURVE',
  categories: ['S2'],
  scratch: false,
  ...extra,
});

describe('Rankings (e2e)', () => {
  let ctx: TestContext;
  let archer: string;

  const http = () => request(ctx.app.getHttpServer());
  const as = (token: string) => ({ Authorization: `Bearer ${token}` });
  const list = () => http().get('/api/v1/rankings').set(as(archer)).expect(200);

  beforeAll(async () => {
    ctx = await createTestApp();
    archer = (
      await http()
        .post('/api/v1/auth/google')
        .send({ idToken: fakeIdToken('r-archer', 'r-archer@gmail.com') })
        .expect(200)
    ).body.accessToken as string;
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('asks for the licence, category and bow first', async () => {
    expect((await list()).body).toEqual({
      season: null,
      missing: ['licenceNumber', 'category', 'bowType'],
      rankings: [],
      complete: true,
    });
  });

  it("finds the archer by licence in their category and bow's rankings", async () => {
    ctx.ffta.rankingLists.set('2027:S', [
      ranking('100'),
      ranking('101', { sex: 'H', name: 'Senior 2 Homme Arc Classique 2027' }),
      ranking('102', { scratch: true, categories: ['S1', 'S2', 'S3'] }),
      ranking('103', { bow: 'COMPOUND' }),
      ranking('104', { categories: ['S1'] }),
    ]);
    ctx.ffta.rankingLists.set('2027:T', [
      ranking('200', { distance: '70m - 122cm' }),
      ranking('201', { distance: '50m - 122cm' }),
    ]);
    ctx.ffta.rankingRows.set('100:0123456A', {
      rank: 12,
      total: 427,
      scores: [545, 528],
      average: 536.5,
    });
    ctx.ffta.rankingRows.set('200:0123456A', { rank: 3, total: 80, scores: [640], average: 640 });
    ctx.ffta.rankingRows.set('201:0123456A', { rank: 1, total: 50, scores: [690], average: 690 });
    await http()
      .patch('/api/v1/profile')
      .set(as(archer))
      .send({
        licenceNumber: '0123456a',
        category: 'S2',
        bowType: 'RECURVE',
        // Beursault has no national ranking.
        disciplines: ['INDOOR', 'TAE_NATIONAL', 'TAE_INTERNATIONAL', 'BEURSAULT'],
      })
      .expect(200);

    // Last season: the archer was a Senior 1.
    ctx.ffta.rankingLists.set('2026:S', [
      ranking('050', { categories: ['S1'], name: 'Senior 1 Femme Arc Classique 2026' }),
      ranking('051', { categories: ['U21'] }),
    ]);
    ctx.ffta.rankingRows.set('050:0123456A', { rank: 30, total: 400, scores: [520], average: 520 });

    const { body } = await list();
    expect(body).toMatchObject({ season: '2027', missing: [], complete: true });
    expect(body.rankings).toEqual([
      {
        season: '2027',
        discipline: 'INDOOR',
        name: 'Senior 2 Femme Arc Classique 2027 (100)',
        distance: null,
        rank: 12,
        total: 427,
        average: 536.5,
        scores: [545, 528],
        url: 'https://extranet.ffta.fr/iframe/classements/100.html',
      },
      // Both TAE: told apart by the distance.
      expect.objectContaining({
        discipline: 'TAE_INTERNATIONAL',
        distance: '70m - 122cm',
        rank: 3,
      }),
      expect.objectContaining({ discipline: 'TAE_NATIONAL', distance: '50m - 122cm', rank: 1 }),
      expect.objectContaining({ season: '2026', discipline: 'INDOOR', rank: 30, total: 400 }),
    ]);
    // Neither the scratch, the other bow's nor the other categories' rankings were read.
    expect([...ctx.ffta.rankingReads].sort()).toEqual(['050', '100', '101', '200', '201']);

    // Kept: the pages are not read again.
    await list();
    expect(ctx.ffta.rankingReads).toHaveLength(5);
  });
});
