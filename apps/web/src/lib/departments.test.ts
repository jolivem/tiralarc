import { describe, expect, it } from 'vitest';
import { departmentOptions } from './departments';

describe('departmentOptions', () => {
  it('groups by region, alphabetically, overseas last', () => {
    expect(
      departmentOptions([
        { code: '971', name: 'Guadeloupe', region: 'Outre-mer' },
        { code: '35', name: 'Ille-et-Vilaine', region: 'Bretagne' },
        { code: '78', name: 'Yvelines', region: 'Île-de-France' },
        { code: '22', name: "Côtes-d'Armor", region: 'Bretagne' },
        { code: '2A', name: 'Corse-du-Sud', region: 'Corse' },
      ]),
    ).toEqual([
      {
        group: 'Bretagne',
        items: [
          { value: '35', label: '35 - Ille-et-Vilaine' },
          { value: '22', label: "22 - Côtes-d'Armor" },
        ],
      },
      { group: 'Corse', items: [{ value: '2A', label: '2A - Corse-du-Sud' }] },
      // "Île" sorts as "Ile", among the I's.
      { group: 'Île-de-France', items: [{ value: '78', label: '78 - Yvelines' }] },
      { group: 'Outre-mer', items: [{ value: '971', label: '971 - Guadeloupe' }] },
    ]);
  });
});
