'use client';

import { ActionIcon, Button, Group, Text } from '@mantine/core';
import { useReducedMotion } from '@mantine/hooks';
import { IconArrowLeft } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { markTourSeen } from '@/app/actions/profile';
import { type Box, GAP, placeNote, spotlight, union } from './tour-layout';
import { registerTour } from './tour-store';
import classes from './tour.module.css';

/**
 * One step: the elements marked `data-tour={target}` are highlighted (those shown: a step whose
 * elements are all missing or hidden is left out), or none (a word of welcome, centred). A list
 * of targets: the first one shown (e.g. an event's icon, else the whole calendar).
 */
export type TourStep = {
  target?: string | readonly string[];
  /** Elements lit along with the target's (`data-tour={also}`), each on its own. */
  also?: string;
  title: string;
  body: string;
};
/** A step as shown: its target picked. */
type ShownStep = Omit<TourStep, 'target'> & { target?: string };

/** Lets the page settle (fonts, notebook lines, a dialog closing) before the first step. */
const START_DELAY_MS = 900;
/** Tours started since the page loaded: a refresh doesn't start one again. */
const started = new Set<string>();

function shownElements(target: string): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>(`[data-tour="${target}"]`)].filter((el) => {
    const box = el.getBoundingClientRect();
    return box.width > 0 && box.height > 0 && getComputedStyle(el).visibility !== 'hidden';
  });
}

/** What is drawn on the page and takes up room of its own: framed as a whole, not looked into. */
const SOLID = 'button, a, input, select, textarea, img, svg, canvas, video, [role="button"]';

/**
 * The element's box on screen; with `data-tour-fit`, only around what is written or drawn in it
 * (its text, buttons, pictures): a notebook's card keeps blank ruled lines that would widen the
 * frame (a heading's first line, over the day's date).
 */
function boxOf(el: HTMLElement): Box {
  const box = ({ top, left, width, height }: DOMRect): Box => ({ top, left, width, height });
  if (!el.hasAttribute('data-tour-fit')) return box(el.getBoundingClientRect());
  const parts: Box[] = [];
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  for (let node = walker.nextNode(); node;) {
    // (Not `instanceof Text`: Mantine's Text is imported here.)
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.textContent?.trim()) {
        range.selectNodeContents(node);
        parts.push(box(range.getBoundingClientRect()));
      }
    } else if (node instanceof Element && node.matches(SOLID)) {
      const rect = node.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) parts.push(box(rect));
      // Not into it: its own box holds it all.
      node = walker.nextSibling() ?? nextOutside(walker);
      continue;
    }
    node = walker.nextNode();
  }
  return union(parts.filter((p) => p.width > 0 && p.height > 0)) ?? box(el.getBoundingClientRect());
}

/** The walker's next node after the current one's subtree, when it has no next sibling. */
function nextOutside(walker: TreeWalker): Node | null {
  while (walker.parentNode()) {
    if (walker.currentNode === walker.root) return null;
    const next = walker.nextSibling();
    if (next) return next;
  }
  return null;
}

/**
 * A page's guided tour: the page dimmed but for one element at a time, a sticky note beside it
 * telling what it does. Starts by itself once (`autoStart`: the archer hasn't seen it, see
 * `toursSeen`), then from the header's "?" button. Seen once finished or skipped.
 */
export function Tour({
  id,
  steps,
  autoStart,
}: {
  id: string;
  steps: TourStep[];
  autoStart: boolean;
}) {
  const [shown, setShown] = useState<ShownStep[] | null>(null);
  const [index, setIndex] = useState(0);

  const start = useCallback(() => {
    setShown(
      steps.flatMap((step): ShownStep[] => {
        if (!step.target) return [{ ...step, target: undefined }];
        const targets = typeof step.target === 'string' ? [step.target] : step.target;
        const target = targets.find((t) => shownElements(t).length > 0);
        return target ? [{ ...step, target }] : [];
      }),
    );
    setIndex(0);
  }, [steps]);

  useEffect(() => registerTour({ id, start }), [id, start]);

  useEffect(() => {
    if (!autoStart || started.has(id)) return;
    const timer = window.setTimeout(() => {
      started.add(id);
      start();
    }, START_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [autoStart, id, start]);

  const close = useCallback(() => {
    setShown(null);
    started.add(id);
    void markTourSeen(id);
  }, [id]);

  const step = shown?.[index];
  if (!shown || !step) return null;
  return createPortal(
    <TourStepView
      step={step}
      index={index}
      total={shown.length}
      onPrevious={() => setIndex((i) => Math.max(i - 1, 0))}
      onNext={() => (index + 1 < shown.length ? setIndex(index + 1) : close())}
      onClose={close}
    />,
    document.body,
  );
}

function TourStepView({
  step,
  index,
  total,
  onPrevious,
  onNext,
  onClose,
}: {
  step: ShownStep;
  index: number;
  total: number;
  onPrevious: () => void;
  onNext: () => void;
  onClose: () => void;
}) {
  const t = useTranslations('tours');
  const titleId = useId();
  const reduceMotion = useReducedMotion();
  const note = useRef<HTMLDivElement>(null);
  const next = useRef<HTMLButtonElement>(null);
  const [target, setTarget] = useState<Box | null>(null);
  const [extra, setExtra] = useState<Box[]>([]);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [noteHeight, setNoteHeight] = useState(0);
  // An id usable in `url(#…)`.
  const maskId = `tour-mask-${titleId.replace(/[^\w-]/g, '')}`;

  // The step's elements brought into view, then followed while the page scrolls or resizes.
  useLayoutEffect(() => {
    const measure = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
      const elements = step.target ? shownElements(step.target) : [];
      setTarget(union(elements.map(boxOf)));
      setExtra(step.also ? shownElements(step.also).map(boxOf) : []);
    };
    const first = step.target ? shownElements(step.target)[0] : undefined;
    first?.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
    measure();
    let frame = 0;
    const later = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    window.addEventListener('scroll', later, { capture: true, passive: true });
    window.addEventListener('resize', later);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', later, { capture: true });
      window.removeEventListener('resize', later);
    };
  }, [step.target, step.also, reduceMotion]);

  // The note's height (it changes with each step's text), to place it.
  useLayoutEffect(() => {
    const element = note.current;
    if (!element) return;
    const measure = () => setNoteHeight(element.offsetHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => next.current?.focus(), [index]);

  // Keyboard: arrows go through the steps, Escape skips the tour.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      else if (event.key === 'ArrowRight') onNext();
      else if (event.key === 'ArrowLeft') onPrevious();
      else return;
      event.preventDefault();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, onNext, onPrevious]);

  // The step's element first (the note points at it), then those lit along with it.
  const lights = (target ? [target, ...extra] : []).map((box) => spotlight(box, viewport));
  const place = placeNote(target, noteHeight, viewport);
  const last = index + 1 === total;
  return (
    <div className={classes.layer} role="dialog" aria-modal="true" aria-labelledby={titleId}>
      {/* The page dimmed but for a hole per lit element; clicks on it are held back meanwhile. */}
      <svg className={classes.veil} aria-hidden>
        <defs>
          <mask id={maskId}>
            <rect width="100%" height="100%" fill="white" />
            {lights.map((light, i) => (
              <rect
                key={i}
                className={classes.hole}
                // Also as CSS, which moves them along (attributes don't transition).
                x={light.left}
                y={light.top}
                width={light.width}
                height={light.height}
                style={{ x: light.left, y: light.top, width: light.width, height: light.height }}
                rx={10}
                fill="black"
              />
            ))}
          </mask>
        </defs>
        <rect width="100%" height="100%" className={classes.dim} mask={`url(#${maskId})`} />
      </svg>
      {lights.map((light, i) => (
        <div
          key={i}
          className={classes.spotlight}
          style={{ top: light.top, left: light.left, width: light.width, height: light.height }}
        />
      ))}
      <div
        ref={note}
        className={classes.note}
        style={{
          top: place.top,
          left: place.left,
          width: place.width,
          // Hidden until measured: it would jump into place.
          visibility: noteHeight && viewport.width ? 'visible' : 'hidden',
        }}
      >
        {(place.side === 'below' || place.side === 'above') && (
          <svg
            className={classes.arrow}
            data-side={place.side}
            style={{ left: place.arrowX - 16, width: 32, height: GAP }}
            viewBox="0 0 32 34"
            aria-hidden
          >
            {/* Drawn by hand: a little curve up to the element, its head in two strokes. */}
            <path d="M17 33 C 9 25, 22 16, 16 4" />
            <path d="M9 11 L16 3 L23 10" />
          </svg>
        )}
        {(place.side === 'right' || place.side === 'left') && (
          <svg
            className={classes.arrow}
            data-side={place.side}
            style={{ top: place.arrowY - 16, width: GAP, height: 32 }}
            viewBox="0 0 34 32"
            aria-hidden
          >
            {/* The same curve, lying down: to the element on the note's left. */}
            <path d="M33 15 C 25 23, 16 10, 4 16" />
            <path d="M11 9 L3 16 L10 23" />
          </svg>
        )}
        <h2 id={titleId} className={classes.title}>
          {step.title}
        </h2>
        <Text className={classes.body}>{step.body}</Text>
        <Group justify="space-between" gap="xs" mt="sm" wrap="nowrap">
          {last ? (
            <span />
          ) : (
            <Button
              variant="subtle"
              color="dark"
              size="compact-sm"
              px={4}
              className={classes.skip}
              onClick={onClose}
            >
              {t('skip')}
            </Button>
          )}
          <Group gap={6} wrap="nowrap">
            {index > 0 && (
              <ActionIcon
                variant="default"
                size={26}
                onClick={onPrevious}
                aria-label={t('previous')}
                title={t('previous')}
              >
                <IconArrowLeft size={16} />
              </ActionIcon>
            )}
            <Text size="sm" className={classes.progress} aria-hidden>
              {index + 1}/{total}
            </Text>
            <Button ref={next} color="dark" size="compact-sm" onClick={onNext}>
              {last ? t('finish') : t('next')}
            </Button>
          </Group>
        </Group>
      </div>
    </div>
  );
}
