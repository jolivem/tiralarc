import { readFileSync } from 'node:fs';
import { departmentByCode, DEPARTMENTS } from './departments.js';
import {
  parseCompetitionDetails,
  parseCompetitionPage,
  parseCompetitionPlace,
  parseFrenchDates,
  textOf,
} from './ffta-parser.js';

const page = readFileSync(new URL('./fixtures/ffta-search.html', import.meta.url), 'utf8');

describe('parseFrenchDates', () => {
  it('reads one day and spans within a month, across months and across years', () => {
    expect(parseFrenchDates('Le 24 octobre 2026')).toEqual({
      startDate: '2026-10-24',
      endDate: '2026-10-24',
    });
    expect(parseFrenchDates('  Du 24 au 25 octobre 2026 ')).toEqual({
      startDate: '2026-10-24',
      endDate: '2026-10-25',
    });
    expect(parseFrenchDates('Du 31 octobre au 01 novembre 2026')).toEqual({
      startDate: '2026-10-31',
      endDate: '2026-11-01',
    });
    expect(parseFrenchDates('Du 5 Décembre au 6 décembre 2026')).toEqual({
      startDate: '2026-12-05',
      endDate: '2026-12-06',
    });
    expect(parseFrenchDates('Du 30 décembre au 02 janvier 2027')).toEqual({
      startDate: '2026-12-30',
      endDate: '2027-01-02',
    });
    expect(parseFrenchDates('Du 31 décembre 2026 au 02 janvier 2027')).toEqual({
      startDate: '2026-12-31',
      endDate: '2027-01-02',
    });
    expect(parseFrenchDates('Le 1 aout 2027')?.startDate).toBe('2027-08-01');
  });

  it('gives up on anything else', () => {
    expect(parseFrenchDates('Le 31 novembre 2026')).toBeNull();
    expect(parseFrenchDates('Du 25 au 24 octobre 2026')).toBeNull();
    expect(parseFrenchDates('Le 24 brumaire 2026')).toBeNull();
    expect(parseFrenchDates('Prochainement')).toBeNull();
  });
});

describe('textOf', () => {
  it('drops tags and decodes entities', () => {
    expect(textOf('<div> CIE D&#039;ARC &amp; <b>Co</b>&nbsp;</div>')).toBe("CIE D'ARC & Co");
  });
});

describe('parseCompetitionPage', () => {
  const { competitions, hasNext } = parseCompetitionPage(page);

  it('reads every competition of a saved result page', () => {
    expect(competitions).toHaveLength(22);
    expect(hasNext).toBe(false);
    expect(competitions[0]).toEqual({
      id: '26345',
      title: 'TIR A 18 M OCTOBRE ROSE à CARRIERES SUR SEINE',
      startDate: '2026-10-24',
      endDate: '2026-10-25',
      city: 'CARRIERES SUR SEINE',
      organizer: 'ARCHERS CARRIERES USC',
      teamOnly: false,
      status: 'SCHEDULED',
      mandateUrl: null,
    });
    expect(competitions[1]).toMatchObject({
      id: '26349',
      organizer: "CIE D'ARC DE VILLEPREUX",
      startDate: '2026-10-31',
      endDate: '2026-11-01',
      mandateUrl: 'https://extranet.ffta.fr/medias/documents_epreuves/1113d04489c14b.pdf',
    });
  });

  it('takes an organiser without a town', () => {
    const [club] = parseCompetitionPage(
      page.replace(
        '<span>ARCHERS CARRIERES USC <small>(CARRIERES SUR SEINE)</small></span>',
        '<span>COMITE REGIONAL ILE DE FRANCE </span>',
      ),
    ).competitions;
    expect(club).toMatchObject({ organizer: 'COMITE REGIONAL ILE DE FRANCE', city: null });
  });

  it('reads the status badges', () => {
    expect(competitions.find((c) => c.id === '26413')?.status).toBe('POSTPONED');
    const cancelled = parseCompetitionPage(
      page.replace('competition_item__head--report', 'competition_item__head--cancel'),
    ).competitions.find((c) => c.id === '26413');
    expect(cancelled?.status).toBe('CANCELLED');
  });

  it('sees the pager', () => {
    expect(parseCompetitionPage('<li class="pager__item pager__item--next">').hasNext).toBe(true);
    expect(parseCompetitionPage('<p>Aucun résultat</p>')).toEqual({
      competitions: [],
      hasNext: false,
    });
  });
});

describe('parseCompetitionPlace', () => {
  const saved = (id: string) =>
    readFileSync(new URL(`./fixtures/ffta-epreuve-${id}.html`, import.meta.url), 'utf8');

  it('reads the venue, street and postcode, or the town alone', () => {
    expect(parseCompetitionPlace(saved('26345'))).toBe(
      "Gymnase de l'Ardente, 13 Rue de Verdun, 78420 CARRIERES SUR SEINE",
    );
    expect(parseCompetitionPlace(saved('27858'))).toBe('CHENNEVIÈRES-SUR-MARNE');
    // The town written another way in the postcode line is not repeated.
    expect(
      parseCompetitionPlace(
        '<p>Lieu : <strong>MAISONS-LAFFITTE</strong></p> <p><strong>Gymnase Colbert</strong></p> ' +
          '<p>3 Avenue Beaumarchais</p> <p>78600 MAISONS LAFFITTE</p> <p>FRANCE</p></div>',
      ),
    ).toBe('Gymnase Colbert, 3 Avenue Beaumarchais, 78600 MAISONS LAFFITTE');
    // A venue without its postcode: the town is added.
    expect(
      parseCompetitionPlace(
        '<p>Lieu : <strong>DRAVEIL</strong></p><p><strong>Stade Pierre Brossolette</strong></p></div>',
      ),
    ).toBe('Stade Pierre Brossolette, DRAVEIL');
    expect(parseCompetitionPlace('<p>Organisateur : <strong>X</strong></p>')).toBeNull();
  });
});

describe('parseCompetitionDetails', () => {
  it('finds the published results, and none before', () => {
    const page =
      '<p>Lieu : <strong>VERSAILLES</strong></p></div>' +
      '<a href="https://extranet.ffta.fr/pdfresultats/2026/T_0878139_20260607_76816.pdf" ' +
      'target="_blank" class="btn competition_detail__results_btn">Résultats</a>';
    expect(parseCompetitionDetails(page)).toEqual({
      place: 'VERSAILLES',
      resultsUrl: 'https://extranet.ffta.fr/pdfresultats/2026/T_0878139_20260607_76816.pdf',
    });
    expect(
      parseCompetitionDetails(
        readFileSync(new URL('./fixtures/ffta-epreuve-26345.html', import.meta.url), 'utf8'),
      ).resultsUrl,
    ).toBeNull();
  });
});

describe('DEPARTMENTS', () => {
  it("maps department codes to the FFTA's term ids", () => {
    expect(DEPARTMENTS).toHaveLength(102);
    expect(departmentByCode('01')?.fftaIds).toEqual([1]);
    expect(departmentByCode('21')?.fftaIds).toEqual([20]);
    expect(departmentByCode('2A')?.fftaIds).toEqual([29]);
    expect(departmentByCode('78')?.fftaIds).toEqual([79]);
    expect(departmentByCode('91')?.fftaIds).toEqual([92]);
    expect(departmentByCode('971')?.fftaIds).toEqual([97]);
    expect(departmentByCode('976')?.fftaIds).toEqual([101]);
    expect(departmentByCode('988')?.fftaIds).toEqual([395, 399]);
    expect(departmentByCode('20')).toBeUndefined();
  });
});
