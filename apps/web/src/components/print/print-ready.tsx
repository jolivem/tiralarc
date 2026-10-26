'use client';

import { useEffect } from 'react';
import { PENDING_ATTRIBUTE, READY_ATTRIBUTE } from './markers';

const POLL_MS = 100;

/**
 * Tells the PDF printer the page is ready: fonts loaded, pictures loaded, nothing marked
 * pending any more, and two frames later (the canvases painted).
 */
export function PrintReady() {
  useEffect(() => {
    let cancelled = false;
    const wait = () => new Promise((resolve) => setTimeout(resolve, POLL_MS));
    const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
    void (async () => {
      await document.fonts.ready;
      while (
        !cancelled &&
        (document.querySelector(`[${PENDING_ATTRIBUTE}]`) ||
          [...document.images].some((image) => !image.complete))
      ) {
        await wait();
      }
      await frame();
      await frame();
      if (!cancelled) document.documentElement.setAttribute(READY_ATTRIBUTE, 'true');
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return null;
}
