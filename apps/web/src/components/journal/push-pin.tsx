'use client';

import { useEffect, useRef } from 'react';
import { drawPin } from './share-card';

/** The drawing's box (the head up left of the point, the shadow down right) and its point. */
const WIDTH = 136;
const HEIGHT = 90;
const POINT_X = 60;
const POINT_Y = 78;

/**
 * The Instagram card's red push pin (`drawPin`), on a canvas drawn at twice its CSS size
 * (sharp on high-density screens). Placed by its class so that its point, `POINT_X / 2`
 * and `POINT_Y / 2` CSS pixels from its top left, goes into what it pins.
 */
export function PushPin({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (ctx) drawPin(ctx, POINT_X, POINT_Y);
  }, []);
  return (
    <canvas
      ref={ref}
      width={WIDTH}
      height={HEIGHT}
      className={className}
      style={{ width: WIDTH / 2, height: HEIGHT / 2 }}
      aria-hidden
    />
  );
}
