import type { JournalSession } from '@tiralarc/api-client';
import { describe, expect, it } from 'vitest';
import { cardLines, filledRows, type ShareWording, wrapText } from './share-card';

/** One unit per character. */
const measure = (text: string) => text.length;

const wording: ShareWording = {
  label: (field) => field,
  date: (date) => `day ${date}`,
  discipline: (d) => d.toLowerCase(),
  feeling: (f) => f.toLowerCase(),
  rating: (v) => `${v}/10`,
  meters: (v) => `${v} m`,
  minutes: (v) => `${v} min`,
  weather: ({ sky, wind, temperatureC }) =>
    [sky, wind, temperatureC].filter((v) => v !== null).join(' '),
  step: (s) => `${s.amount} ${s.unit} ${s.description}`.trim(),
};

const session = {
  date: '2026-10-12',
  location: 'Gymnase',
  discipline: 'INDOOR',
  distanceMeters: 18,
  durationMinutes: null,
  arrowCount: 60,
  score: 0,
  objective: '  Rester relâché  ',
  satisfaction: 7,
  technique: null,
  physicalFeeling: 'GREAT',
  mentalFeeling: null,
  description: null,
  wentWell: ['Placement', ' ', ''],
  toImprove: ['', '', ''],
  nextTime: null,
  steps: [],
} as unknown as JournalSession;

describe('filledRows', () => {
  it('words the filled fields only, in order, lists without blank lines', () => {
    expect(filledRows(session, wording)).toEqual([
      { field: 'date', label: 'date', text: 'day 2026-10-12' },
      { field: 'location', label: 'location', text: 'Gymnase' },
      { field: 'discipline', label: 'discipline', text: 'indoor' },
      { field: 'distance', label: 'distance', text: '18 m' },
      { field: 'arrows', label: 'arrows', text: '60' },
      { field: 'score', label: 'score', text: '0' },
      { field: 'objective', label: 'objective', text: 'Rester relâché' },
      { field: 'satisfaction', label: 'satisfaction', text: '7/10', rating: 7 },
      { field: 'physical', label: 'physical', text: 'great', feeling: 'GREAT' },
      { field: 'wentWell', label: 'wentWell', items: ['Placement'], bullet: 'well' },
    ]);
  });

  it('lists the steps after the objective, one per line, across the whole width', () => {
    const planned = {
      ...session,
      steps: [
        { unit: 'MINUTES', amount: 15, target: null, description: 'Échauffement', done: true },
        { unit: 'ARROWS', amount: 36, target: 'STRAW', description: '', done: false },
      ],
    } as JournalSession;
    const rows = filledRows(planned, wording);
    const steps = rows.find((row) => row.field === 'steps');
    expect(steps).toEqual({
      field: 'steps',
      label: 'steps',
      items: ['15 MINUTES Échauffement', '36 ARROWS'],
      bullet: 'step',
    });
    expect(rows.map((row) => row.field).slice(6, 9)).toEqual([
      'objective',
      'steps',
      'satisfaction',
    ]);
    // Never beside another list: its label then its lines, bulleted.
    const lines = cardLines([steps!, rows.at(-1)!], 60, measure);
    expect(lines.slice(0, 2)).toEqual([
      { label: 'steps :', text: '' },
      { text: '15 MINUTES Échauffement', indent: true, bullet: 'step' },
    ]);
  });

  it('gives the weather after the score, with what was noted for its drawings', () => {
    const outdoor = { ...session, sky: 'RAINY', wind: null, temperatureC: 9 } as JournalSession;
    const rows = filledRows(outdoor, wording);
    expect(rows.map((row) => row.field).slice(5, 8)).toEqual(['score', 'weather', 'objective']);
    expect(rows.find((row) => row.field === 'weather')).toEqual({
      field: 'weather',
      label: 'weather',
      text: 'RAINY 9',
      weather: { sky: 'RAINY', wind: null, temperatureC: 9 },
    });
    // Its line on the card: the label, then the drawings (`weather`).
    expect(cardLines(rows.slice(6, 7), 40, measure)).toEqual([
      {
        label: 'weather : ',
        text: 'RAINY 9',
        weather: { sky: 'RAINY', wind: null, temperatureC: 9 },
      },
    ]);
  });
});

describe('wrapText', () => {
  it('wraps on words, the first line narrower, keeping line breaks', () => {
    expect(wrapText('aa bb cc dd\nee', 5, 8, measure)).toEqual(['aa bb', 'cc dd', 'ee']);
  });

  it('gives a word too long a line of its own', () => {
    expect(wrapText('a verylongword b', 6, 6, measure)).toEqual(['a', 'verylongword', 'b']);
  });
});

describe('cardLines', () => {
  it('puts the short fields two by two, wrapped in their column', () => {
    // 40 wide, 3 between the columns: 18.5 each.
    const lines = cardLines(
      [
        { field: 'location', label: 'Lieu', text: 'Salle du club' },
        { field: 'discipline', label: 'Disc', text: 'salle' },
        { field: 'score', label: 'Score', text: '540' },
        { field: 'objective', label: 'Obj', text: 'Rester' },
      ],
      40,
      measure,
    );
    expect(lines).toEqual([
      { label: 'Lieu : ', text: 'Salle du', right: { label: 'Disc : ', text: 'salle' } },
      { text: 'club' },
      { label: 'Score : ', text: '540' },
      { label: 'Obj : ', text: 'Rester' },
    ]);
  });

  it('puts the two lists side by side, the longer one going on alone', () => {
    // 40 wide, 3 between the columns: 18.5 each, 16.5 once indented.
    const lines = cardLines(
      [
        { field: 'wentWell', label: 'Bien', items: ['Placement', 'Rythme'], bullet: 'well' },
        { field: 'toImprove', label: 'Mieux', items: ['Lâcher plus souple'], bullet: 'improve' },
      ],
      40,
      measure,
    );
    expect(lines).toEqual([
      { label: 'Bien :', text: '', right: { label: 'Mieux :', text: '' } },
      {
        text: 'Placement',
        indent: true,
        bullet: 'well',
        right: { text: 'Lâcher plus', indent: true, bullet: 'improve' },
      },
      {
        text: 'Rythme',
        indent: true,
        bullet: 'well',
        right: { text: 'souple', indent: true, bullet: undefined },
      },
    ]);
  });

  it('starts each field with its label, a face on its line, lists indented and bulleted', () => {
    const lines = cardLines(
      [
        { field: 'objective', label: 'Obj', text: 'Rester bien relâché' },
        { field: 'physical', label: 'Physique', text: 'bof', feeling: 'BAD' },
        { field: 'mental', label: 'Mental', text: 'yeah, très long', feeling: 'GREAT' },
        { field: 'technique', label: 'Technique', text: '3/10', rating: 3 },
        { field: 'wentWell', label: 'Bien', items: ['Bon rythme encore'], bullet: 'well' },
      ],
      16,
      measure,
    );
    expect(lines).toEqual([
      { label: 'Obj : ', text: 'Rester' },
      { text: 'bien relâché' },
      // Faces side by side, a rating: one line, never wrapped.
      {
        label: 'Physique : ',
        text: 'bof',
        feeling: 'BAD',
        right: { label: 'Mental : ', text: 'yeah, très long', feeling: 'GREAT' },
      },
      { label: 'Technique : ', text: '3/10', rating: 3 },
      { label: 'Bien :', text: '' },
      { text: 'Bon rythme', indent: true, bullet: 'well' },
      { text: 'encore', indent: true, bullet: undefined },
    ]);
  });
});
