'use client';

import {
  createContext,
  type CSSProperties,
  type ReactNode,
  use,
  useEffect,
  useRef,
  useState,
} from 'react';
import classes from './notebook.module.css';

const Height = createContext<{ height: number; setHeight: (height: number) => void } | null>(null);

/**
 * Lines a block of the left page up with one of the right page, from desktops up (the pages
 * side by side): the right page's top (`AlignedTop`) is measured, and the left page leaves as
 * much room (`AlignedSpacer`) above its own block.
 */
export function PageAlignment({ children }: { children: ReactNode }) {
  const [height, setHeight] = useState(0);
  return <Height value={{ height, setHeight }}>{children}</Height>;
}

/** On the right page: what comes before the block to line up with (measured as it changes). */
export function AlignedTop({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const setHeight = use(Height)?.setHeight;
  useEffect(() => {
    const element = ref.current;
    if (!element || !setHeight) return;
    const observer = new ResizeObserver(() => setHeight(element.offsetHeight));
    observer.observe(element);
    return () => observer.disconnect();
  }, [setHeight]);
  return (
    <div ref={ref} className={classes.alignedTop}>
      {children}
    </div>
  );
}

/**
 * On the left page: blank room as tall as the right page's top, so the next block (with no gap
 * before it, as on the right) starts level with the right page's.
 */
export function AlignedSpacer() {
  const height = use(Height)?.height ?? 0;
  return (
    <div
      className={classes.alignedSpacer}
      style={{ '--aligned-height': `${height}px` } as CSSProperties}
      aria-hidden
    />
  );
}
