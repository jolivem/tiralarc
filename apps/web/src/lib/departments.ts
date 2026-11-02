import type { Department } from '@tiralarc/api-client';

/** Overseas departments: grouped last, after the regions of metropolitan France. */
const OVERSEAS = 'Outre-mer';

/**
 * A department list's look (`styles` of a Select / MultiSelect): the regions' names larger and
 * bolder, in the text colour (Mantine's group labels are small, dimmed); under each, its
 * departments indented and close together.
 */
export const DEPARTMENT_LIST_STYLES = {
  groupLabel: {
    fontSize: 'var(--mantine-font-size-md)',
    fontWeight: 700,
    color: 'var(--mantine-color-text)',
  },
  option: {
    paddingInlineStart: 'calc(var(--mantine-spacing-xs) + 1.25rem)',
    paddingBlock: '2px',
  },
};

/**
 * The departments as select options, grouped by region (alphabetically, overseas last), each
 * labelled "78 - Yvelines", in the given order (the API's: by code) within its region.
 */
export function departmentOptions(departments: Department[]) {
  const regions = [...new Set(departments.map((d) => d.region))].sort((a, b) =>
    a === OVERSEAS ? 1 : b === OVERSEAS ? -1 : a.localeCompare(b, 'fr'),
  );
  return regions.map((region) => ({
    group: region,
    items: departments
      .filter((d) => d.region === region)
      .map((d) => ({ value: d.code, label: `${d.code} - ${d.name}` })),
  }));
}
