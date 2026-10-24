import { readFileSync } from 'node:fs';
import { findRankingRow, parseRankingList, parseRankingSeason } from './ffta-rankings.js';

const saved = (name: string) =>
  readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');

describe('parseRankingList', () => {
  const page = saved('ffta-rankings-tae.html');

  it('reads the season the list opens on', () => {
    expect(parseRankingSeason(page)).toBe('2027');
    expect(parseRankingSeason('<p>Maintenance</p>')).toBeNull();
  });

  it('reads each ranking: distance, sex, bow, categories', () => {
    const rankings = parseRankingList(page);
    expect(rankings).toHaveLength(18);
    expect(rankings[0]).toEqual({
      id: '14450',
      name: 'Seniors Femme Arc Nu 2027',
      distance: '50m - 122cm',
      sex: 'F',
      bow: 'BAREBOW',
      categories: ['S1', 'S2', 'S3'],
      scratch: false,
    });
    expect(rankings.find((r) => r.name.startsWith('U13-U15 Femme Arc à Poulies'))).toMatchObject({
      bow: 'COMPOUND',
      categories: ['U13', 'U15'],
    });
  });

  it('tells the scratch rankings, and reads lists without distances', () => {
    const [scratch, indoor] = parseRankingList(
      '<tr data-href="/iframe/classements/14470.html"><td>Scratch Homme Arc Classique 2027</td>' +
        '<td>Tir à 18m</td><td>Homme</td><td>Arc Classique</td>' +
        '<td>U18 - U21 - Senior 1 - Senior 2 - Senior 3</td></tr>' +
        '<tr data-href="/iframe/classements/14548.html"><td>Senior 1 Homme Arc Classique 2027</td>' +
        '<td>Tir à 18m</td><td>Homme</td><td>Arc Classique</td><td>Senior 1</td></tr>',
    );
    expect(scratch).toMatchObject({ scratch: true, distance: null, sex: 'H' });
    expect(indoor).toMatchObject({ scratch: false, bow: 'RECURVE', categories: ['S1'] });
  });
});

describe('findRankingRow', () => {
  const page = saved('ffta-ranking.html');

  it("reads the archer's row only, found by licence", () => {
    expect(findRankingRow(page, ' 0123456a ')).toEqual({
      rank: 2,
      total: 3,
      scores: [545, 528],
      average: 536.5,
    });
    expect(findRankingRow(page, '9999999Z')).toBeNull();
  });

  it('reads rankings of several categories (a Cat column)', () => {
    const withCategory = page.replace(
      /(data-term>ARCHERE DEUXIEME<\/a><\/td>)/,
      '$1<td class=" ac" >S2</td>',
    );
    expect(findRankingRow(withCategory, '0123456A')).toMatchObject({ rank: 2, average: 536.5 });
  });
});
