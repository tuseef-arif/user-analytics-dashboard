const LINES = 36;

interface Ribbon {
  id: string;
  colors: [string, string, string];
  path: (i: number) => string;
  className: string;
}

// Each ribbon is many thin, slightly offset curves, which reads as a woven neon mesh.
const RIBBONS: Ribbon[] = [
  {
    id: 'ribbon-warm',
    colors: [
      'var(--color-neon-magenta)',
      'var(--color-neon-orange)',
      'var(--color-neon-lime)',
    ],
    path: (i) =>
      `M ${-100 + i * 6} ${520 - i * 10} C ${300 + i * 8} ${760 - i * 16}, ${700 - i * 6} ${40 + i * 12}, ${1300 + i * 2} ${20 + i * 14}`,
    className: '-top-24 right-0',
  },
  {
    id: 'ribbon-cool',
    colors: [
      'var(--color-neon-violet)',
      'var(--color-neon-magenta)',
      'var(--color-neon-violet)',
    ],
    path: (i) =>
      `M ${-100 + i * 5} ${260 + i * 12} C ${250 - i * 6} ${80 + i * 14}, ${650 + i * 9} ${800 - i * 14}, ${1300 - i * 4} ${480 + i * 9}`,
    className: '-bottom-24 left-0',
  },
];

export function WaveMesh() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {RIBBONS.map((ribbon) => (
        <svg
          key={ribbon.id}
          viewBox="0 0 1200 800"
          preserveAspectRatio="none"
          className={`motion-safe:animate-drift absolute h-3/4 w-full opacity-60 ${ribbon.className}`}
        >
          <defs>
            <linearGradient id={ribbon.id}>
              {ribbon.colors.map((color, index) => (
                <stop
                  key={index}
                  offset={`${index * 50}%`}
                  style={{ stopColor: color }}
                />
              ))}
            </linearGradient>
          </defs>
          {Array.from({ length: LINES }, (_, i) => (
            <path
              key={i}
              d={ribbon.path(i)}
              fill="none"
              stroke={`url(#${ribbon.id})`}
              strokeWidth={0.8}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
      ))}
    </div>
  );
}
