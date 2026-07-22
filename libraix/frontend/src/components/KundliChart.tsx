import type { HoroscopeChart } from "../lib/tools";

/** Text centers for houses 1–12 in a classic North Indian diamond kundli (viewBox 0–400). */
const HOUSE_POS: Record<number, { x: number; y: number }> = {
  1: { x: 200, y: 88 },
  2: { x: 108, y: 52 },
  3: { x: 52, y: 108 },
  4: { x: 88, y: 200 },
  5: { x: 52, y: 292 },
  6: { x: 108, y: 348 },
  7: { x: 200, y: 312 },
  8: { x: 292, y: 348 },
  9: { x: 348, y: 292 },
  10: { x: 312, y: 200 },
  11: { x: 348, y: 108 },
  12: { x: 292, y: 52 },
};

interface KundliChartProps {
  chart: HoroscopeChart;
}

export function KundliChart({ chart }: KundliChartProps) {
  const byHouse = new Map(chart.houses.map((h) => [h.number, h]));

  return (
    <div className="kundli-wrap" aria-label="North Indian birth chart">
      <svg className="kundli-svg" viewBox="0 0 400 400" role="img">
        <title>Vedic North Indian kundli</title>
        <rect x="8" y="8" width="384" height="384" className="kundli-frame" rx="4" />
        {/* Outer diamond */}
        <polygon points="200,16 384,200 200,384 16,200" className="kundli-diamond" />
        {/* Diagonals + mid lines */}
        <line x1="16" y1="16" x2="384" y2="384" className="kundli-line" />
        <line x1="384" y1="16" x2="16" y2="384" className="kundli-line" />
        <line x1="200" y1="16" x2="200" y2="384" className="kundli-line" />
        <line x1="16" y1="200" x2="384" y2="200" className="kundli-line" />
        {/* Inner square accents */}
        <polygon points="200,108 292,200 200,292 108,200" className="kundli-inner" />

        {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => {
          const house = byHouse.get(n);
          const pos = HOUSE_POS[n];
          const planets = house?.planets ?? [];
          const label = planets.map((p) => p.short).join(" ");
          return (
            <g key={n}>
              <text x={pos.x} y={pos.y - 14} className="kundli-house-num" textAnchor="middle">
                {n}
                {house ? ` · ${house.symbol}` : ""}
              </text>
              <text x={pos.x} y={pos.y + 6} className="kundli-sign" textAnchor="middle">
                {house?.sign ?? ""}
              </text>
              {label ? (
                <text x={pos.x} y={pos.y + 26} className="kundli-planets" textAnchor="middle">
                  {label}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      <p className="kundli-caption">
        North Indian style · House 1 = Lagna
        {chart.lagna ? ` (${chart.lagna.rashi} / ${chart.lagna.rashiWestern})` : ""} · Lahiri ayanamsa
      </p>
    </div>
  );
}
