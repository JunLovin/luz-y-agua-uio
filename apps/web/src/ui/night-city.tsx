const BUILDINGS = [
  { x: 6, w: 34, h: 58 },
  { x: 44, w: 26, h: 40 },
  { x: 74, w: 40, h: 74 },
  { x: 118, w: 30, h: 50 },
  { x: 152, w: 44, h: 88 },
  { x: 200, w: 28, h: 46 },
  { x: 232, w: 38, h: 66 },
  { x: 274, w: 30, h: 42 },
  { x: 308, w: 42, h: 80 },
  { x: 354, w: 40, h: 54 },
];
const GROUND = 250;
const STARS = [
  [40, 30],
  [96, 54],
  [150, 22],
  [262, 40],
  [372, 26],
  [210, 34],
  [118, -12],
  [300, -6],
];

const WINDOWS = BUILDINGS.flatMap(({ x, w, h }) => {
  const cols = Math.floor((w - 8) / 12);
  const rows = Math.floor((h - 12) / 16);
  return Array.from({ length: cols * rows }, (_, i) => ({
    x: x + 7 + (i % cols) * 12,
    y: GROUND - h + 9 + Math.floor(i / cols) * 16,
  }));
});

/** Quito under Pichincha, as in the app's onboarding: most windows lit, a river in agua blue. */
export function NightCity() {
  return (
    <svg
      className="scene"
      viewBox="0 -30 400 290"
      aria-hidden="true"
      focusable="false"
    >
      {STARS.map(([cx, cy]) => (
        <circle
          key={`${cx}-${cy}`}
          cx={cx}
          cy={cy}
          r={1.6}
          fill="var(--muted)"
          style={{ opacity: "var(--stars)" }}
        />
      ))}
      <circle cx={318} cy={22} r={18} fill="var(--scene-sky)" />
      <path
        d="M0 178 L52 146 L96 154 L150 98 L168 82 L184 90 L204 64 L222 58 L242 76 L290 126 L350 116 L400 140 L400 260 L0 260 Z"
        fill="var(--scene-far)"
      />
      <path
        d="M0 206 L70 186 L140 198 L220 176 L300 192 L400 180 L400 260 L0 260 Z"
        fill="var(--scene-near)"
      />
      {BUILDINGS.map(({ x, w, h }) => (
        <rect
          key={x}
          x={x}
          y={GROUND - h}
          width={w}
          height={h}
          rx={4}
          fill="var(--scene-building)"
        />
      ))}
      {WINDOWS.map(({ x, y }, i) => (
        <rect
          key={`${x}-${y}`}
          x={x}
          y={y}
          width={6}
          height={8}
          rx={1.5}
          fill={(i * 37) % 5 < 3 ? "var(--luz)" : "var(--scene-window)"}
        />
      ))}
      <path
        d="M0 256 C80 246 140 262 210 252 S330 244 400 254"
        stroke="var(--agua)"
        strokeWidth={3}
        fill="none"
      />
    </svg>
  );
}
