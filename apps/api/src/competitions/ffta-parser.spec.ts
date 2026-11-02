import { readFileSync } from 'node:fs';
import { departmentByCode, DEPARTMENTS } from './departments.js';
import {
  parseCompetitionDetails,
  parseCompetitionPage,
  championshipAge,
  championshipLevel,
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

describe('championshipLevel', () => {
  // Titles as found on the site for the 2026-2027 season.
  it('tells the individual French, regional and departmental championships', () => {
    const levels = {
      NATIONAL: [
        'CHAMPIONNAT DE FRANCE JEUNE à LANDERNEAU',
        'CHAMPIONNAT DE FRANCE ADULTE à YZEURE',
        'CHAMPIONNAT DE FRANCE ELITE à RIOM',
        'CHAMPIONNAT DE FRANCE PAR CATEGORIES à SAINT AVERTIN',
        'Championnat de France à ST GENEVIEVE DES BOIS',
      ],
      REGIONAL: [
        'CHAMPIONNAT RÉGIONAL EN SALLE ADULTES à CAEN',
        'CHAMPIONNAT REGIONAL JEUNE 18M CVL à TOURS',
        'CHAMPIONNAT RÉGIONAL DE NORMANDIE à ALENCON',
        'CHAMPIONNAT DE LIGUE SALLE à METZ',
      ],
      DEPARTMENTAL: [
        'CHAMPIONNAT DÉPARTEMENTAL 68 à COLMAR',
        'CHAMPIONNATDEPARTEMENTAL TIR A 18M JEUNES à ROUEN',
        'CHAMPIONNAT DÉPARTEMANTAL à AUCH',
        'TIR À 18M - NEVERS 2027 - CHAMPIONNAT DÉPARTEMENTAL 58 à NEVERS',
        'CHAMPIONNAT CD56 DE TIR A 18 M à VANNES',
      ],
    };
    for (const [level, titles] of Object.entries(levels)) {
      for (const title of titles) expect(championshipLevel(title)).toBe(level);
    }
  });

  it('leaves out the qualifying competitions, the team championships and the others', () => {
    for (const title of [
      'SÉLECTIF AU CHAMPIONNAT DE FRANCE à LIEVIN',
      '2 FOIS 18M SELECTIF CHAMPIONNAT DE FRANCE à REZÉ',
      'CONCOURS SALLE QUALIFICATIF AU CHAMPIONNAT DE FRANCE à BLERIOT PLAGE',
      'CHAMPIONNAT DE FRANCE PAR EQUIPE DE CLUBS à AMILLY',
      'CHAMPIONNAT DE FRANCE DOUBLES MIXTES JEUNES à RIOM',
      '1ERE MANCHE CHAMPIONNAT DE FRANCE DE D1 à A VENIR',
      'FINALE DU CHAMPIONNAT DE FRANCE D2 à A VENIR',
      'CHAMPIONNAT RÉGIONAL PAR EQUIPES DE CLUBS à LENS',
      'CHAMPIONNAT DÉPARTEMENTAL JEUNE PAR EQUIPE à CANDÉ',
      'TIR À 18M à VILLEPREUX',
    ]) {
      expect(championshipLevel(title)).toBeNull();
    }
  });
});

describe('championshipAge', () => {
  it('tells the young archers’ championships from the adults’', () => {
    expect(championshipAge('CHAMPIONNAT DE FRANCE JEUNE à LANDERNEAU')).toBe('YOUTH');
    expect(championshipAge('CHAMPIONNAT DÉPARTEMENTAL 76 JEUNES EN SALLE à ROUEN')).toBe('YOUTH');
    expect(championshipAge('CHAMPIONNAT DE FRANCE ADULTE à YZEURE')).toBe('ADULT');
    expect(championshipAge('CHAMPIONNAT DE FRANCE ELITE à RIOM')).toBe('ADULT');
    expect(championshipAge('CHAMPIONNAT REGIONAL SALLE S1 ET S2 à CAEN')).toBe('ADULT');
    expect(championshipAge('CHAMPIONNAT DE FRANCE PAR CATEGORIES à SAINT AVERTIN')).toBeNull();
    expect(championshipAge('CHAMPIONNAT RÉGIONAL 18 MÈTRES à TOURS')).toBeNull();
  });
});

describe('parseCompetitionPlace', () => {
  const saved = (id: string) =>
    readFileSync(new URL(`./fixtures/ffta-epreuve-${id}.html`, import.meta.url), 'utf8');

  it('reads the town only, not the venue nor its address', () => {
    expect(parseCompetitionPlace(saved('26345'))).toBe('CARRIERES SUR SEINE');
    expect(parseCompetitionPlace(saved('27858'))).toBe('CHENNEVIÈRES-SUR-MARNE');
    expect(
      parseCompetitionPlace(
        '<p>Lieu : <strong>DRAVEIL</strong></p><p><strong>Stade Pierre Brossolette</strong></p></div>',
      ),
    ).toBe('DRAVEIL');
    expect(parseCompetitionPlace('<p>Lieu : <strong> </strong></p>')).toBeNull();
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
