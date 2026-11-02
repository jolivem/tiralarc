import { DEPARTMENTS } from './departments.js';

describe('departments', () => {
  it('puts every department in one region', () => {
    expect(DEPARTMENTS.filter((d) => !d.region)).toEqual([]);
    const codesOf = (region: string) =>
      DEPARTMENTS.filter((d) => d.region === region).map((d) => d.code);
    expect(new Set(DEPARTMENTS.map((d) => d.region)).size).toBe(14);
    expect(codesOf('Île-de-France')).toEqual(['75', '77', '78', '91', '92', '93', '94', '95']);
    expect(codesOf('Outre-mer')).toEqual(['971', '972', '973', '974', '976', '988']);
  });
});
