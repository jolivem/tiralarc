/** Set on <html> once the extract is drawn: what lib/pdf.ts waits for before printing. */
export const READY_ATTRIBUTE = 'data-print-ready';
/** On what is still being drawn (a decoration read, a month's name lettered…). */
export const PENDING_ATTRIBUTE = 'data-print-pending';
/** On each printed sheet (paginate.tsx). */
export const SHEET_ATTRIBUTE = 'data-print-sheet';
/** On a sheet sharing the page of the sheet before it. */
export const FOLLOWS_ATTRIBUTE = 'data-print-follows';
/** On a month's left page, which must land on an even page (lib/pdf.ts). */
export const SPREAD_ATTRIBUTE = 'data-print-spread';
/** On the blank page before a month: "shown" when the month needs it to face its pages. */
export const BLANK_ATTRIBUTE = 'data-print-blank';
/** On the parts left out of a trial print (lib/pdf.ts counting pages). */
export const HIDDEN_ATTRIBUTE = 'data-print-hidden';
