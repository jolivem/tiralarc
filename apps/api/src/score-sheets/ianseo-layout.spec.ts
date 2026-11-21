import { describe, expect, it } from 'vitest';
import { toursProblem } from './ianseo-layout.js';
import { parseTours } from './ianseo-parser.js';

const row = (id: number, days: string) =>
  `<tr><td><a href="Details.php?toId=${id}">Concours ${id}</a></td><td class="column7">${days}</td></tr>` +
  `<tr><td><a href="Details.php?toId=${id}">Club</a></td></tr>`;

describe('toursProblem', () => {
  it('accepts a list it can read', () => {
    const html = `<table>${row(1, '8 Nov')}${row(2, '9-10 Nov')}</table>`;
    expect(toursProblem(html, parseTours(html, 2026))).toBeNull();
  });

  it('reports a list without any competition link', () => {
    const html = '<div class="new-layout">Compétitions</div>';
    expect(toursProblem(html, parseTours(html, 2026))).toMatchObject({ fatal: true });
  });

  it('reports links whose dates can no longer be read', () => {
    const html = `<table>${row(1, '').replace('column7', 'date')}${row(2, '').replace('column7', 'date')}</table>`;
    const problem = toursProblem(html, parseTours(html, 2026));
    expect(problem).toMatchObject({ fatal: true });
    expect(problem?.problem).toContain('2 compétition(s)');
  });

  it('reports, without dropping the reading, most dates unreadable', () => {
    const html = `<table>${row(1, '8 Nov')}${row(2, 'bientôt')}${row(3, '?')}</table>`;
    expect(toursProblem(html, parseTours(html, 2026))).toMatchObject({ fatal: false });
  });
});
