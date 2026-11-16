import { describe, expect, it } from 'vitest';
import {
  competitionProblem,
  isBotChallenge,
  rankingProblem,
  rankingsProblem,
  searchProblem,
} from './ffta-layout.js';
import { parseCompetitionPage } from './ffta-parser.js';

const item = (id: string, dates = 'Le 24 octobre 2026') => `<article class="competition_item">
  <div class="competition_item__head competition_item__head--valid"></div>
  <div class="competition_item__dates">${dates}</div>
  <h2 class="competition_item__title">Concours salle ${id}</h2>
  <a href="/epreuve/${id}">Infos</a>
</article>`;

/** A search page as the site serves it: its view, with or without results. */
const searchPage = (items: string) =>
  `<html><body><div class="view view-competitions view-id-competitions"><div class="view-content">${items}</div></div></body></html>`;

const check = (html: string) => searchProblem(html, parseCompetitionPage(html));

describe('searchProblem', () => {
  it('accepts a page of competitions, and one that found none', () => {
    expect(check(searchPage(item('1') + item('2')))).toBeNull();
    expect(check(searchPage(''))).toBeNull();
  });

  it('drops a page without the competitions view (a new layout)', () => {
    expect(check('<html><body><main>Nouveau site</main></body></html>')).toMatchObject({
      fatal: true,
    });
  });

  it('drops a page whose competitions are no longer in their <article>', () => {
    const html = searchPage('<div class="competition_item"><a href="/epreuve/1">x</a></div>');
    expect(check(html)).toMatchObject({ fatal: true });
  });

  it('reports competitions it cannot read, keeping the others', () => {
    const found = check(searchPage(item('1') + item('2', 'Bientôt')));
    expect(found).toEqual({
      problem: expect.stringContaining('1 compétition(s) sur 2'),
      fatal: false,
    });
  });

  it('drops the page when none of its competitions can be read', () => {
    expect(check(searchPage(item('1', '24/10/2026')))).toMatchObject({ fatal: true });
  });
});

describe('the other pages', () => {
  it("recognise a competition's page by its path class", () => {
    expect(competitionProblem('<body class="path-epreuve"><p>Lieu : RIOM</p></body>')).toBeNull();
    expect(competitionProblem('<body class="path-node"></body>')).toMatchObject({ fatal: true });
  });

  it('recognise the rankings list by its season filter, and need a season', () => {
    const list = '<select id="search[Annee]"><option value="2027" selected>2027</option></select>';
    expect(rankingsProblem(list, '2027')).toBeNull();
    expect(rankingsProblem(list)).toBeNull();
    expect(rankingsProblem(list, null)).toMatchObject({ fatal: true });
    expect(rankingsProblem('<select id="annee"></select>')).toMatchObject({ fatal: true });
  });

  it("recognise a ranking's page by its table", () => {
    expect(rankingProblem('<table border="1" class="orbe3 full clmt keep-heights">')).toBeNull();
    expect(rankingProblem('<table class="ranking">')).toMatchObject({ fatal: true });
  });

  it("tell Cloudflare's check page from a new layout", () => {
    expect(isBotChallenge('<html><head><title>Just a moment...</title>')).toBe(true);
    expect(isBotChallenge(searchPage(''))).toBe(false);
  });
});
