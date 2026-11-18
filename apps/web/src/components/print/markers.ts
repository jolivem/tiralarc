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
/** On a chapter's title page, which must land on a right-hand (odd) page (lib/pdf.ts). */
export const CHAPTER_ATTRIBUTE = 'data-print-chapter';
/** On the index's page numbers: the chapter's id, its first page written in (lib/pdf.ts). */
export const CHAPTER_PAGE_ATTRIBUTE = 'data-print-chapter-page';
/**
 * On the blank page before a month or a chapter: "shown" when it needs it to start on the
 * right side (a month's left page even, a chapter's title page odd).
 */
export const BLANK_ATTRIBUTE = 'data-print-blank';
/** On the parts left out of a trial print (lib/pdf.ts counting pages). */
export const HIDDEN_ATTRIBUTE = 'data-print-hidden';
