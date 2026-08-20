const CHART_HEIGHT = 180;
const MAX_BAR_WIDTH = 24;

function niceMax(value: number) {
  if (value <= 0) return 10;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

export function BarChart({
  data,
  color,
  formatValue,
}: {
  data: { label: string; value: number }[];
  color: string;
  formatValue: (v: number) => string;
}) {
  const max = niceMax(Math.max(...data.map((d) => d.value), 0));
  const ticks = [0, max * 0.25, max * 0.5, max * 0.75, max];
  const slotWidth = 100 / Math.max(data.length, 1);
  const barWidthPct = Math.min(slotWidth * 0.6, 6);

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 100 ${CHART_HEIGHT + 24}`}
        preserveAspectRatio="none"
        className="h-48 w-full"
        style={{ minWidth: `${Math.max(data.length * 28, 300)}px` }}
      >
        {ticks.map((t, i) => {
          const y = CHART_HEIGHT - (t / max) * CHART_HEIGHT;
          return (
            <line
              key={i}
              x1={0}
              x2={100}
              y1={y}
              y2={y}
              stroke="#e2e8f0"
              strokeWidth={0.3}
            />
          );
        })}

        {data.map((d, i) => {
          const x = i * slotWidth + (slotWidth - barWidthPct) / 2;
          const barHeight = max > 0 ? (d.value / max) * CHART_HEIGHT : 0;
          const y = CHART_HEIGHT - barHeight;
          return (
            <g key={i}>
              <title>
                {d.label} — {formatValue(d.value)}
              </title>
              <rect
                x={x}
                y={y}
                width={barWidthPct}
                height={Math.max(barHeight, 1)}
                rx={Math.min(barWidthPct / 3, 1.2)}
                fill={color}
              />
              <text
                x={x + barWidthPct / 2}
                y={CHART_HEIGHT + 10}
                fontSize={3}
                textAnchor="middle"
                fill="#94a3b8"
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
