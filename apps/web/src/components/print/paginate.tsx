'use client';

import { useEffect, useState } from 'react';
import { FOLLOWS_ATTRIBUTE, PENDING_ATTRIBUTE, SHEET_ATTRIBUTE } from './markers';
import classes from './print.module.css';

const POLL_MS = 100;
/** Rounding slack, in pixels, when two sheets are exactly a page high. */
const SLACK = 0.5;

const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
const wait = () => new Promise((resolve) => setTimeout(resolve, POLL_MS));

/**
 * Two sheets in a row that fit on one page together share it: the second is marked to follow
 * the first (no page break, a rule between them). Measured once everything else is drawn,
 * the page laid out at the paper's width (lib/pdf.ts); pending until then, so the PDF waits.
 * Sheets go by two at most, and a sheet followed by its photos stays alone. (The months'
 * facing pages are settled by lib/pdf.ts, which counts the printed pages.)
 */
export function Paginate() {
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await document.fonts.ready;
      const probe = `.${classes.pageProbe}`;
      while (
        !cancelled &&
        (document.querySelector(`[${PENDING_ATTRIBUTE}]:not(${probe})`) ||
          [...document.images].some((image) => !image.complete))
      ) {
        await wait();
      }
      await frame();
      if (cancelled) return;
      const pageHeight = document.querySelector(probe)?.getBoundingClientRect().height ?? 0;
      const sheets = [...document.querySelectorAll<HTMLElement>(`[${SHEET_ATTRIBUTE}]`)];
      for (let i = 0; i < sheets.length - 1; i++) {
        const [first, second] = [sheets[i]!, sheets[i + 1]!];
        if (first.nextElementSibling !== second) continue;
        second.setAttribute(FOLLOWS_ATTRIBUTE, '');
        const height = second.getBoundingClientRect().bottom - first.getBoundingClientRect().top;
        if (height <= pageHeight + SLACK) i += 1;
        else second.removeAttribute(FOLLOWS_ATTRIBUTE);
      }
      setDone(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return <div className={classes.pageProbe} {...(!done && { [PENDING_ATTRIBUTE]: '' })} />;
}
