'use client';

import { type CSSProperties, type ReactNode, useLayoutEffect, useRef } from 'react';
import classes from './notebook.module.css';

/**
 * Puts every `[data-on-ruling]` text of a page (`[data-leaf]`) on the page's ruling: each is
 * pushed down (padding) to the next ruled line, in page order — pushing one moves the next.
 * Its line box (a whole number of lines) then lowers the text's baseline onto the last of them.
 */
function snapPage(leaf: HTMLElement) {
  const step = parseFloat(getComputedStyle(leaf).getPropertyValue('--step'));
  if (!step) return;
  const texts = [...leaf.querySelectorAll<HTMLElement>('[data-on-ruling]')];
  for (const text of texts) text.style.paddingTop = '';
  for (const text of texts) {
    const top = text.getBoundingClientRect().top - leaf.getBoundingClientRect().top;
    const push = Math.ceil(top / step - 0.01) * step - top;
    if (push > 0.5) text.style.paddingTop = `${push}px`;
  }
}

/**
 * A text written on the page's lines, whatever comes above it: snapped again whenever the page
 * or anything before it changes size (a list loaded, a card shown…).
 */
export function OnRuling({
  as: Tag,
  lines,
  className,
  style,
  children,
}: {
  as: 'h2' | 'h3' | 'p';
  /** How many lines its box takes (its baseline on the last). */
  lines: number;
  className?: string;
  /** Its font, when a class doesn't give it. */
  style?: CSSProperties;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const text = ref.current;
    const leaf = text?.closest<HTMLElement>('[data-leaf]');
    if (!text || !leaf) return;
    const snap = () => snapPage(leaf);
    snap();
    // The page, and at each level up to it, the blocks beside the text (those above it move it).
    const observer = new ResizeObserver(snap);
    observer.observe(leaf);
    for (let node: HTMLElement = text; node !== leaf && node.parentElement;) {
      const parent: HTMLElement = node.parentElement;
      for (const sibling of parent.children) observer.observe(sibling);
      node = parent;
    }
    return () => observer.disconnect();
  }, []);
  return (
    <Tag
      ref={ref as never}
      data-on-ruling
      className={className ? `${classes.onRuling} ${className}` : classes.onRuling}
      style={{ ...style, '--lines': lines } as CSSProperties}
    >
      {children}
    </Tag>
  );
}

/**
 * A handwritten heading of a page (like HandHeading), on two of its lines. `raised`: its first
 * (blank) line over the last line of what comes before, so it is written a line higher.
 */
export function RuledHeading({
  raised = false,
  children,
}: {
  raised?: boolean;
  children: ReactNode;
}) {
  const className = `${classes.hand} ${classes.ruledHeading}`;
  return (
    <OnRuling as="h2" lines={2} className={raised ? `${className} ${classes.raised}` : className}>
      {children}
    </OnRuling>
  );
}

/** A one-line subtitle on the page's lines, e.g. "Saison 2027". */
export function RuledSubtitle({ children }: { children: ReactNode }) {
  return (
    <OnRuling as="h3" lines={1} className={classes.ruledSubtitle}>
      {children}
    </OnRuling>
  );
}

/** Any one line of text on the page's lines, styled by the caller (e.g. a month's name). */
export function RuledLine({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <OnRuling as="p" lines={1} className={className}>
      {children}
    </OnRuling>
  );
}
