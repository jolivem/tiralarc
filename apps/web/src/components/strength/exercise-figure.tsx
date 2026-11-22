import type { ExerciseId, StrengthLoad } from '@/lib/strength';

type P = readonly [number, number];

/**
 * A stick figure's pose in a 120 × 90 box (the ground at y = 84): head, neck, hip, and for each
 * side elbow + hand, knee + foot (`l…` = the far side, drawn paler). `hands`: which hold the load
 * (both by default); `anchor`: where a band is fixed — a point, under the feet (default) or
 * between the hands; `props`: furniture drawn behind.
 */
interface Pose {
  head: P;
  neck: P;
  hip: P;
  le: P;
  lh: P;
  re: P;
  rh: P;
  lk: P;
  lf: P;
  rk: P;
  rf: P;
  hands?: 'both' | 'right';
  anchor?: P | 'feet' | 'between';
  props?: ('ground' | 'bar' | 'bench' | 'wall' | 'bow')[];
}

/** Standing, side view: the legs and trunk most standing exercises share. */
const STAND = {
  head: [60, 13],
  neck: [60, 22],
  hip: [60, 50],
  lk: [58, 67],
  lf: [57, 84],
  rk: [62, 67],
  rf: [63, 84],
} as const;
/** Standing, facing: legs apart. */
const FACING = { ...STAND, lk: [54, 67], lf: [51, 84], rk: [66, 67], rf: [69, 84] } as const;
const DOWN = { le: [58, 36], lh: [57, 50], re: [62, 36], rh: [63, 50] } as const;

const POSES: Record<ExerciseId, Pose> = {
  PLANK_FRONT: {
    head: [99, 62],
    neck: [90, 67],
    hip: [55, 73],
    le: [88, 84],
    lh: [100, 84],
    re: [90, 84],
    rh: [102, 84],
    lk: [37, 78],
    lf: [18, 84],
    rk: [38, 79],
    rf: [20, 84],
  },
  PLANK_SIDE: {
    head: [95, 44],
    neck: [88, 51],
    hip: [55, 68],
    le: [88, 84],
    lh: [98, 84],
    re: [88, 38],
    rh: [88, 24],
    lk: [37, 76],
    lf: [18, 84],
    rk: [38, 77],
    rf: [20, 82],
  },
  DEAD_BUG: {
    head: [95, 77],
    neck: [86, 80],
    hip: [55, 81],
    le: [83, 64],
    lh: [81, 48],
    re: [94, 66],
    rh: [104, 58],
    lk: [52, 62],
    lf: [38, 61],
    rk: [40, 76],
    rf: [22, 74],
    hands: 'both',
    anchor: [118, 70],
    props: ['ground'],
  },
  BIRD_DOG: {
    head: [94, 56],
    neck: [85, 61],
    hip: [50, 62],
    le: [86, 73],
    lh: [86, 84],
    re: [99, 58],
    rh: [113, 55],
    lk: [50, 84],
    lf: [34, 84],
    rk: [34, 60],
    rf: [17, 57],
    hands: 'right',
    anchor: [118, 70],
  },
  CRUNCH: {
    head: [88, 62],
    neck: [80, 69],
    hip: [55, 81],
    le: [76, 63],
    lh: [68, 71],
    re: [78, 64],
    rh: [70, 72],
    lk: [44, 62],
    lf: [34, 84],
    rk: [46, 62],
    rf: [36, 84],
    props: ['ground'],
  },
  SUPERMAN: {
    head: [94, 72],
    neck: [85, 77],
    hip: [55, 81],
    le: [99, 72],
    lh: [112, 67],
    re: [100, 73],
    rh: [113, 69],
    lk: [38, 79],
    lf: [20, 74],
    rk: [39, 80],
    rf: [21, 76],
    props: ['ground'],
  },
  PALLOF_PRESS: {
    ...STAND,
    le: [70, 34],
    lh: [84, 34],
    re: [71, 35],
    rh: [85, 35],
    anchor: [117, 35],
  },
  EXTERNAL_ROTATION: {
    ...STAND,
    ...DOWN,
    re: [62, 37],
    rh: [78, 37],
    hands: 'right',
    anchor: [117, 38],
  },
  INTERNAL_ROTATION: {
    ...STAND,
    ...DOWN,
    re: [62, 37],
    rh: [76, 39],
    hands: 'right',
    anchor: [3, 38],
  },
  LATERAL_RAISE: {
    ...FACING,
    le: [46, 24],
    lh: [31, 24],
    re: [74, 24],
    rh: [89, 24],
  },
  FRONT_RAISE: {
    ...STAND,
    le: [72, 23],
    lh: [86, 23],
    re: [73, 24],
    rh: [87, 24],
  },
  FACE_PULL: {
    ...STAND,
    le: [74, 20],
    lh: [70, 14],
    re: [75, 21],
    rh: [71, 15],
    anchor: [117, 15],
  },
  Y_T_W: {
    head: [94, 76],
    neck: [85, 80],
    hip: [55, 81],
    le: [97, 70],
    lh: [107, 61],
    re: [98, 72],
    rh: [109, 64],
    lk: [38, 82],
    lf: [20, 82],
    rk: [39, 82],
    rf: [21, 82],
    props: ['ground'],
  },
  SHOULDER_PRESS: {
    ...FACING,
    head: [60, 15],
    neck: [60, 23],
    le: [46, 19],
    lh: [48, 4],
    re: [74, 19],
    rh: [72, 4],
  },
  BAND_ROW: {
    ...STAND,
    hip: [58, 50],
    lk: [62, 66],
    rk: [64, 66],
    le: [54, 38],
    lh: [70, 40],
    re: [55, 39],
    rh: [71, 41],
    anchor: [117, 40],
  },
  DUMBBELL_ROW: {
    head: [88, 31],
    neck: [80, 36],
    hip: [45, 46],
    le: [82, 48],
    lh: [84, 58],
    re: [66, 30],
    rh: [70, 44],
    lk: [40, 66],
    lf: [34, 84],
    rk: [49, 66],
    rf: [47, 84],
    hands: 'right',
    props: ['bench'],
  },
  BAND_PULL_APART: {
    ...FACING,
    le: [47, 27],
    lh: [33, 28],
    re: [73, 27],
    rh: [87, 28],
    anchor: 'between',
  },
  REVERSE_FLY: {
    head: [88, 33],
    neck: [80, 38],
    hip: [46, 46],
    le: [82, 50],
    lh: [86, 60],
    re: [88, 44],
    rh: [98, 48],
    lk: [43, 66],
    lf: [38, 84],
    rk: [50, 66],
    rf: [49, 84],
  },
  PULL_UP: {
    head: [60, 19],
    neck: [60, 27],
    hip: [60, 53],
    le: [47, 16],
    lh: [51, 4],
    re: [73, 16],
    rh: [69, 4],
    lk: [57, 68],
    lf: [55, 82],
    rk: [63, 68],
    rf: [65, 82],
    hands: 'both',
    anchor: 'feet',
    props: ['bar'],
  },
  PUSH_UP: {
    head: [97, 55],
    neck: [88, 60],
    hip: [55, 70],
    le: [89, 72],
    lh: [89, 84],
    re: [91, 72],
    rh: [91, 84],
    lk: [37, 77],
    lf: [18, 84],
    rk: [38, 78],
    rf: [20, 84],
  },
  TRICEPS_DIP: {
    head: [72, 26],
    neck: [72, 34],
    hip: [70, 62],
    le: [86, 44],
    lh: [80, 56],
    re: [87, 45],
    rh: [81, 57],
    lk: [48, 62],
    lf: [38, 84],
    rk: [50, 63],
    rf: [40, 84],
    props: ['bench'],
  },
  BICEPS_CURL: {
    ...STAND,
    ...DOWN,
    le: [60, 38],
    lh: [70, 29],
    re: [62, 38],
    rh: [72, 28],
  },
  WRIST_CURL: {
    ...STAND,
    ...DOWN,
    le: [60, 38],
    lh: [75, 38],
    re: [62, 38],
    rh: [77, 38],
  },
  FARMER_CARRY: {
    ...STAND,
    le: [58, 36],
    lh: [57, 52],
    re: [62, 36],
    rh: [63, 52],
    lk: [54, 67],
    lf: [47, 84],
    rk: [66, 67],
    rf: [73, 84],
  },
  SQUAT: {
    head: [70, 23],
    neck: [66, 31],
    hip: [48, 58],
    le: [76, 38],
    lh: [88, 38],
    re: [77, 39],
    rh: [89, 39],
    lk: [66, 64],
    lf: [58, 84],
    rk: [68, 65],
    rf: [60, 84],
  },
  LUNGE: {
    head: [60, 22],
    neck: [60, 31],
    hip: [58, 58],
    le: [58, 44],
    lh: [57, 58],
    re: [62, 44],
    rh: [63, 58],
    lk: [42, 76],
    lf: [28, 84],
    rk: [76, 64],
    rf: [78, 84],
  },
  WALL_SIT: {
    head: [37, 25],
    neck: [37, 33],
    hip: [37, 62],
    le: [42, 47],
    lh: [52, 58],
    re: [44, 48],
    rh: [54, 59],
    lk: [58, 62],
    lf: [58, 84],
    rk: [60, 62],
    rf: [60, 84],
    props: ['wall'],
  },
  CALF_RAISE: {
    ...STAND,
    ...DOWN,
    head: [60, 10],
    neck: [60, 19],
    hip: [60, 47],
    lk: [58, 64],
    lf: [59, 79],
    rk: [62, 64],
    rf: [63, 79],
  },
  GLUTE_BRIDGE: {
    head: [96, 79],
    neck: [87, 82],
    hip: [60, 64],
    le: [80, 84],
    lh: [70, 84],
    re: [82, 84],
    rh: [72, 84],
    lk: [41, 59],
    lf: [34, 84],
    rk: [43, 60],
    rf: [36, 84],
    hands: 'both',
    anchor: 'feet',
  },
  SINGLE_LEG_BALANCE: {
    ...STAND,
    ...DOWN,
    rk: [72, 57],
    rf: [68, 70],
  },
  ANCHOR_HOLD: {
    ...STAND,
    le: [78, 24],
    lh: [95, 24],
    re: [46, 25],
    rh: [64, 22],
    hands: 'both',
    anchor: 'between',
    props: ['bow'],
  },
  BAND_DRAW: {
    ...STAND,
    le: [78, 24],
    lh: [95, 24],
    re: [46, 25],
    rh: [64, 22],
    anchor: 'between',
  },
  SCAPULAR_SETTING: {
    ...STAND,
    le: [73, 27],
    lh: [87, 27],
    re: [74, 28],
    rh: [88, 28],
    anchor: [117, 28],
  },
  BOW_ARM_HOLD: {
    ...STAND,
    ...DOWN,
    re: [78, 24],
    rh: [95, 24],
    hands: 'right',
    anchor: [117, 24],
  },
};

/** A band's colour by strength (the usual yellow / red / blue code of training bands). */
const BAND_COLORS: Partial<Record<StrengthLoad, string>> = {
  BAND_LIGHT: '#e8b72e',
  BAND_MEDIUM: '#e5484d',
  BAND_STRONG: '#3e63dd',
};

const line = (a: P, b: P) => `M${a[0]} ${a[1]}L${b[0]} ${b[1]}`;

/** The furniture's extent, as points (bench, bar, wall). */
const PROP_POINTS: Record<NonNullable<Pose['props']>[number], P[]> = {
  ground: [],
  bow: [],
  bar: [
    [36, 4],
    [84, 4],
  ],
  wall: [[30, 20]],
  bench: [
    [74, 60],
    [104, 85],
  ],
};

/** Every drawing's frame, in the poses' units: the same for all, so all figures share a scale. */
const FRAME_H = 86;
const FRAME_W = (FRAME_H * 4) / 3;

/**
 * The viewBox: a FRAME_W × FRAME_H window (4:3) centred on the pose, its band's anchor (with a
 * band) and its furniture — one size for every exercise, so a figure is as tall in each.
 */
function frame(pose: Pose, exercise: ExerciseId, anchor: Pose['anchor']): string {
  const points: P[] = [
    pose.head,
    pose.neck,
    pose.hip,
    pose.le,
    pose.lh,
    pose.re,
    pose.rh,
    pose.lk,
    pose.lf,
    pose.rk,
    pose.rf,
    ...(Array.isArray(anchor) ? [anchor as P] : []),
    ...(pose.props ?? []).flatMap((prop) => PROP_POINTS[prop]),
    ...(exercise === 'TRICEPS_DIP' ? ([[112, 58]] as P[]) : []),
    // The bow, above and under the bow hand.
    ...(pose.props?.includes('bow')
      ? ([
          [pose.lh[0] + 4, pose.lh[1] - 20],
          [pose.lh[0] + 4, pose.lh[1] + 20],
        ] as P[])
      : []),
  ];
  const xs = points.map((p) => p[0]);
  // Centred on the pose sideways; from the bar's height down to just under the floor, so a
  // lying figure lies on the same floor as a standing one stands on.
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  return `${cx - FRAME_W / 2} ${88 - FRAME_H} ${FRAME_W} ${FRAME_H}`;
}

/** A dumbbell held at `at`: a short bar and its two plates. */
function Dumbbell({ at }: { at: P }) {
  const [x, y] = at;
  return (
    <g fill="currentColor">
      <rect x={x - 6} y={y - 1} width={12} height={2} rx={1} />
      <rect x={x - 8} y={y - 4} width={3} height={8} rx={1} />
      <rect x={x + 5} y={y - 4} width={3} height={8} rx={1} />
    </g>
  );
}

/**
 * A small drawing of an exercise (a stick figure in its position), equipped for `load`:
 * dumbbells in the hands with a weight, a band in its colour stretched to its anchor (a wall,
 * the feet, the other hand), nothing with body weight. Lines in `currentColor`.
 */
export function ExerciseFigure({
  exercise,
  load,
  size = 64,
  label,
}: {
  exercise: ExerciseId;
  load: StrengthLoad;
  size?: number;
  /** Accessible name; decorative when left out. */
  label?: string;
}) {
  const pose = POSES[exercise];
  const holding = pose.hands === 'right' ? [pose.rh] : [pose.lh, pose.rh];
  const band = BAND_COLORS[load];
  const anchor = pose.anchor ?? 'feet';
  const props = pose.props ?? [];

  /** The band from a hand to its anchor, sagging a little. */
  const bandPath = (hand: P) => {
    const to: P =
      anchor === 'feet'
        ? hand[0] < 60
          ? pose.lf
          : pose.rf
        : anchor === 'between'
          ? pose.lh
          : anchor;
    const mid: P = [(hand[0] + to[0]) / 2, (hand[1] + to[1]) / 2 + 3];
    return `M${hand[0]} ${hand[1]}Q${mid[0]} ${mid[1]} ${to[0]} ${to[1]}`;
  };

  const box = frame(pose, exercise, band !== undefined ? anchor : 'feet');

  return (
    <svg
      // Framed on the figure and what it uses: a lying exercise fills its box too.
      viewBox={box}
      width={size}
      height={(size * 90) / 120}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* The floor, and what the exercise uses. */}
      <path d="M4 85H116" strokeWidth={1.5} opacity={0.35} />
      {props.includes('bar') && <path d="M36 4H84" strokeWidth={3} />}
      {props.includes('wall') && <path d="M30 20V85" strokeWidth={3} opacity={0.5} />}
      {props.includes('bench') && (
        <path
          d={
            exercise === 'TRICEPS_DIP'
              ? 'M78 58H112M82 58V85M108 58V85'
              : 'M74 60H104M78 60V85M100 60V85'
          }
          strokeWidth={2.5}
          opacity={0.5}
        />
      )}
      {anchor !== 'feet' && anchor !== 'between' && band && (
        <circle cx={anchor[0]} cy={anchor[1]} r={2.5} fill="currentColor" opacity={0.6} />
      )}
      {/* The far limbs, paler. */}
      <g strokeWidth={3.2} opacity={0.4}>
        <path d={`${line(pose.neck, pose.le)}${line(pose.le, pose.lh)}`} />
        <path d={`${line(pose.hip, pose.lk)}${line(pose.lk, pose.lf)}`} />
      </g>
      {/* A bow in the bow hand, its string to the drawing hand. */}
      {props.includes('bow') && (
        <g strokeWidth={1.8}>
          <path
            d={`M${pose.lh[0] - 4} ${pose.lh[1] - 20}Q${pose.lh[0] + 8} ${pose.lh[1]} ${pose.lh[0] - 4} ${pose.lh[1] + 20}`}
          />
          <path
            d={`M${pose.lh[0] - 4} ${pose.lh[1] - 20}L${pose.rh[0]} ${pose.rh[1]}L${pose.lh[0] - 4} ${pose.lh[1] + 20}`}
            strokeWidth={0.8}
          />
        </g>
      )}
      <g strokeWidth={3.6}>
        <path d={line(pose.neck, pose.hip)} />
        <path d={`${line(pose.neck, pose.re)}${line(pose.re, pose.rh)}`} />
        <path d={`${line(pose.hip, pose.rk)}${line(pose.rk, pose.rf)}`} />
      </g>
      <circle cx={pose.head[0]} cy={pose.head[1]} r={6} fill="currentColor" stroke="none" />
      {/* The load: a band to its anchor, or dumbbells in the hands. */}
      {band &&
        (anchor === 'between' ? (
          <path d={bandPath(pose.rh)} stroke={band} strokeWidth={2.6} />
        ) : (
          holding.map((hand, i) => (
            <path key={i} d={bandPath(hand)} stroke={band} strokeWidth={2.6} />
          ))
        ))}
      {load === 'KG' && holding.map((hand, i) => <Dumbbell key={i} at={hand} />)}
    </svg>
  );
}
