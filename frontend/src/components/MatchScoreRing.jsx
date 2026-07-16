import React from "react";

// The five dimensions the matching engine scores, in a fixed order so the
// ring's visual rhythm is consistent across every card in the app.
const DIMENSIONS = [
  { key: "interests", label: "Interests", color: "#B23A55" }, // rose
  { key: "location", label: "Location", color: "#E4A11B" }, // marigold
  { key: "horoscope", label: "Horoscope", color: "#5C7A5E" }, // sage
  { key: "education", label: "Education", color: "#3E2C52" }, // ink-soft
  { key: "lifestyle", label: "Lifestyle", color: "#6B5A80" }, // ink-muted
];

/**
 * Renders the match score as five arcs (one per dimension), each swept
 * proportional to that dimension's 0-100 sub-score, so the ring's overall
 * "fullness" and color balance tell the compatibility story at a glance —
 * not just a single generic percentage.
 */
export default function MatchScoreRing({ score, breakdown, size = 120 }) {
  const strokeWidth = size * 0.09;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const gapDeg = 3; // small visual gap between arcs
  const totalDeg = 360 - gapDeg * DIMENSIONS.length;

  let cursor = -90; // start at 12 o'clock

  const arcs = DIMENSIONS.map((dim) => {
    const value = breakdown?.[dim.key] ?? 0;
    // Each dimension gets an equal-angle slot; fill proportion within the
    // slot reflects that dimension's score (so a 0 looks like a gap, a 100
    // fills the whole slot).
    const slot = totalDeg / DIMENSIONS.length;
    const filled = (value / 100) * slot;
    const startAngle = cursor;
    cursor += slot + gapDeg;

    const trackPath = describeArc(size / 2, size / 2, radius, startAngle, startAngle + slot);
    const fillPath = describeArc(size / 2, size / 2, radius, startAngle, startAngle + filled);

    return { ...dim, trackPath, fillPath, value };
  });

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {arcs.map((a) => (
            <path
              key={`${a.key}-track`}
              d={a.trackPath}
              stroke={a.color}
              strokeOpacity={0.15}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
            />
          ))}
          {arcs.map((a) => (
            <path
              key={`${a.key}-fill`}
              d={a.fillPath}
              stroke={a.color}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-2xl font-semibold text-ink">{Math.round(score)}</span>
          <span className="text-[10px] uppercase tracking-wide text-ink-muted">match</span>
        </div>
      </div>
    </div>
  );
}

export function MatchScoreLegend({ breakdown }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-ink-muted">
      {DIMENSIONS.map((d) => (
        <span key={d.key} className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
          {d.label} · {Math.round(breakdown?.[d.key] ?? 0)}
        </span>
      ))}
    </div>
  );
}

function polarToCartesian(cx, cy, r, angleDeg) {
  const angleRad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
}

function describeArc(cx, cy, r, startAngle, endAngle) {
  if (endAngle <= startAngle) {
    const p = polarToCartesian(cx, cy, r, startAngle);
    return `M ${p.x} ${p.y}`;
  }
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
}
