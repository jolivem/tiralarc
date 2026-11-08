import {
  candidateTours,
  findParticipant,
  normalize,
  parseDays,
  parseFiles,
  parseTours,
  sameLicence,
  sheetPages,
} from './ianseo-parser.js';

describe('ianseo pages', () => {
  it.each([
    ['1 Nov', '2026-11-01', '2026-11-01'],
    ['8-10 May', '2026-05-08', '2026-05-10'],
    ['31 Oct - 1 Nov', '2026-10-31', '2026-11-01'],
    ['30 Dec - 2 Jan', '2026-12-30', '2027-01-02'],
  ])('reads the days "%s"', (text, from, to) => {
    expect(parseDays(text, 2026)).toEqual({ from, to });
  });

  it('leaves out days it cannot read', () => {
    expect(parseDays('soon', 2026)).toBeNull();
  });

  it('reads the list, a competition taking two rows', () => {
    const html = `<table>
      <tr class="a" onclick="window.open('Details.php?toId=30484','_self')"><td class="column2">Tir &agrave; 18m</td>
        <td class="column4">Compagnie d'Arc de Villepreux</td><td class="column7">31 Oct - 1 Nov</td></tr>
      <tr onclick="window.open('Details.php?toId=30484','_self')"><td>Location: Avenue</td></tr>
      <tr><td>No link</td></tr>
    </table>`;
    const [tour, ...others] = parseTours(html, 2026);
    expect(others).toEqual([]);
    expect(tour).toMatchObject({ id: 30484, from: '2026-10-31', to: '2026-11-01' });
    expect(tour?.text).toContain('Villepreux');
    expect(tour?.text).toContain('Location');
  });

  it("tells the organiser's score sheets from the other documents", () => {
    const html = `
      <a href="/TourData/2026/30484/contre marques Samedi Matin.pdf?time=1"><img></a>
      <a>Feuilles de marque Samedi matin</a>
      <a href="/TourData/2026/30484/Autres tirs.pdf?time=2"></a><a>Autres tirs</a>
      <a href="/TourData/2026/30484/IC.pdf?time=3"></a><a>Résultats</a>
      <a href="/TourData/2026/30484/ENA.pdf?time=4"></a><a>Participants</a>`;
    expect(parseFiles(html)).toEqual({
      participants: '/TourData/2026/30484/ENA.pdf',
      sheets: ['/TourData/2026/30484/contre marques Samedi Matin.pdf'],
    });
  });
});

describe('finding the archer', () => {
  const archer = { licenceNumber: '15639z', lastName: 'Dupré', firstName: 'Léa' };

  it('compares licences and names loosely', () => {
    expect(sameLicence('0015639Z', '15639 z')).toBe(true);
    expect(sameLicence('0015639Z', '0015638Z')).toBe(false);
    expect(normalize("  Dupré-L'Hôte ")).toBe('DUPRE L HOTE');
  });

  it('needs the licence and the name on the same row', () => {
    const rows = [
      ['0015639Z', 'MARTIN Paul', '0878143'],
      ['0099999A', 'DUPRE Lea', '0878143'],
    ];
    expect(findParticipant(rows, archer)).toBeNull();
    expect(
      findParticipant([...rows, ['0015639Z', 'Dupré Léa', '0878134', 'Villepreux']], archer),
    ).toEqual({ name: 'Dupré Léa', club: '0878134' });
  });

  const page = (name: string, club: string, start: string) =>
    `Archer: ${name} Club: ${club} - Départ ${start} 10 9 Total 540`;
  const entry = { name: 'Dupré Léa', club: '0878134' };

  it('keeps her pages, not a namesake of another club nor a list', () => {
    const pages = [
      page('Martin Paul', '0878134', '1 - Samedi matin'),
      page('Dupré Léa', '0878134', '2 - Samedi soir'),
      page('Dupré Léa', '0123456', '2 - Samedi soir'),
      'Dupré Léa 0878134 participants',
    ];
    expect(sheetPages(pages, entry, '2026-10-31')).toEqual([1]);
  });

  it('takes the page of the day when she shot twice', () => {
    const pages = [
      page('Dupré Léa', '0878134', '1 - Samedi matin'),
      page('Dupré Léa', '0878134', '3 - Dimanche matin'),
    ];
    expect(sheetPages(pages, entry, '2026-11-01')).toEqual([1]);
    expect(sheetPages(pages, entry, '2026-11-02')).toEqual([0, 1]);
  });

  it("looks first at the event's place, on its day", () => {
    const at = (id: number, from: string, text: string) => ({ id, from, to: from, text });
    const tours = [
      at(1, '2026-10-31', 'Tir de Rouen'),
      at(2, '2026-10-31', "Compagnie d'Arc de Villepreux"),
      at(3, '2026-11-07', 'Villepreux encore'),
    ];
    expect(candidateTours(tours, '2026-10-31', 'Villepreux').map((t) => t.id)).toEqual([2, 1]);
    expect(candidateTours(tours, '2026-10-31', null).map((t) => t.id)).toEqual([1, 2]);
  });
});
