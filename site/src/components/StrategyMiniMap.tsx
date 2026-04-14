import { useMemo } from 'react';

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

interface Strategy {
  slug: string;
  x1: string;
  type: string;
}

interface Props {
  strategies: Strategy[];
  phaseColors: Record<string, string>;
  phaseKeys: string[];
  x1Order: string[];
  filtersX1: Set<string>;
  filtersType: Set<string>;
  onToggleX1: (v: string) => void;
  onToggleType: (v: string) => void;
  onHoverPhase: (phase: string | null) => void;
  onHoverX1: (x1: string | null) => void;
  hoveredPhase: string | null;
  hoveredX1: string | null;
  totalCount: number;
  filteredCount: number;
  size?: number;
}

interface X1Seg {
  x1: string;
  count: number;
  startAngle: number;
  endAngle: number;
}
interface PhaseSeg {
  phase: string;
  count: number;
  startAngle: number;
  endAngle: number;
  x1Segments: X1Seg[];
}

// -------------------------------------------------------------------
// Geometry
// -------------------------------------------------------------------

const VB = 200;
const CX = 100;
const CY = 100;

// Two rings: inner = X1, outer = phase
const R_IN_INNER = 32;
const R_IN_OUTER = 62;
const R_OUT_INNER = 65;
const R_OUT_OUTER = 92;

const TAU = Math.PI * 2;

function polar(cx: number, cy: number, r: number, angle: number) {
  const a = angle - Math.PI / 2;
  const round = (v: number) => Math.round(v * 100) / 100;
  return { x: round(cx + r * Math.cos(a)), y: round(cy + r * Math.sin(a)) };
}

function arcPath(cx: number, cy: number, r0: number, r1: number, start: number, end: number) {
  if (end - start < 1e-4) return '';
  if (end - start >= TAU - 1e-4) {
    const mid = start + (end - start) / 2;
    const p1 = polar(cx, cy, r1, start);
    const p2 = polar(cx, cy, r1, mid);
    const p3 = polar(cx, cy, r0, mid);
    const p4 = polar(cx, cy, r0, start);
    return (
      `M ${p1.x} ${p1.y} A ${r1} ${r1} 0 1 1 ${p2.x} ${p2.y} A ${r1} ${r1} 0 1 1 ${p1.x} ${p1.y} Z ` +
      `M ${p4.x} ${p4.y} A ${r0} ${r0} 0 1 0 ${p3.x} ${p3.y} A ${r0} ${r0} 0 1 0 ${p4.x} ${p4.y} Z`
    );
  }
  const largeArc = end - start > Math.PI ? 1 : 0;
  const p1 = polar(cx, cy, r1, start);
  const p2 = polar(cx, cy, r1, end);
  const p3 = polar(cx, cy, r0, end);
  const p4 = polar(cx, cy, r0, start);
  return `M ${p1.x} ${p1.y} A ${r1} ${r1} 0 ${largeArc} 1 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${r0} ${r0} 0 ${largeArc} 0 ${p4.x} ${p4.y} Z`;
}

// -------------------------------------------------------------------
// Component
// -------------------------------------------------------------------

export default function StrategyMiniMap({
  strategies,
  phaseColors,
  phaseKeys,
  x1Order,
  filtersX1,
  filtersType,
  onToggleX1,
  onToggleType,
  onHoverPhase,
  onHoverX1,
  hoveredPhase,
  hoveredX1,
  totalCount,
  filteredCount,
  size = 120,
}: Props) {
  const anyFilter = filtersType.size > 0 || filtersX1.size > 0;
  const phaseSegments = useMemo<PhaseSeg[]>(() => {
    const byPhase = new Map<string, Strategy[]>();
    for (const p of phaseKeys) byPhase.set(p, []);
    for (const s of strategies) {
      if (byPhase.has(s.type)) byPhase.get(s.type)!.push(s);
    }

    const total = strategies.length || 1;
    let angle = 0;
    const segs: PhaseSeg[] = [];

    for (const phase of phaseKeys) {
      const items = byPhase.get(phase) || [];
      if (items.length === 0) continue;
      const phaseSweep = (items.length / total) * TAU;
      const phaseStart = angle;
      const phaseEnd = angle + phaseSweep;

      const byX1 = new Map<string, number>();
      for (const s of items) byX1.set(s.x1, (byX1.get(s.x1) || 0) + 1);
      const orderedX1 = [...byX1.entries()].sort(
        (a, b) => x1Order.indexOf(a[0]) - x1Order.indexOf(b[0]),
      );

      let x1Angle = phaseStart;
      const x1Segments: X1Seg[] = [];
      for (const [x1, count] of orderedX1) {
        const x1Sweep = (count / items.length) * phaseSweep;
        x1Segments.push({
          x1,
          count,
          startAngle: x1Angle,
          endAngle: x1Angle + x1Sweep,
        });
        x1Angle += x1Sweep;
      }

      segs.push({
        phase,
        count: items.length,
        startAngle: phaseStart,
        endAngle: phaseEnd,
        x1Segments,
      });
      angle = phaseEnd;
    }

    return segs;
  }, [strategies, phaseKeys, x1Order]);

  const hasTypeFilter = filtersType.size > 0;
  const hasX1Filter = filtersX1.size > 0;

  function phaseDim(phase: string) {
    return hasTypeFilter && !filtersType.has(phase);
  }
  function x1Dim(phase: string, x1: string) {
    if (phaseDim(phase)) return true;
    if (hasX1Filter && !filtersX1.has(x1)) return true;
    return false;
  }

  return (
    <svg
      viewBox={`0 0 ${VB} ${VB}`}
      width={size}
      height={size}
      className="shrink-0"
      style={{ overflow: 'visible' }}
      onMouseLeave={() => {
        onHoverPhase(null);
        onHoverX1(null);
      }}
    >
      {/* White backing disk */}
      <circle
        cx={CX}
        cy={CY}
        r={R_OUT_OUTER + 6}
        fill="#ffffff"
        stroke="rgba(0,0,0,0.04)"
        strokeWidth={1}
      />

      {/* Inner ring — X1 */}
      {phaseSegments.flatMap((ps) =>
        ps.x1Segments.map((x1s) => {
          const dim = x1Dim(ps.phase, x1s.x1);
          const isHover = hoveredX1 === x1s.x1;
          return (
            <path
              key={`x1-${ps.phase}-${x1s.x1}`}
              d={arcPath(CX, CY, R_IN_INNER, R_IN_OUTER, x1s.startAngle, x1s.endAngle)}
              fill={phaseColors[ps.phase] ?? '#999'}
              fillOpacity={dim ? 0.12 : isHover ? 0.9 : 0.55}
              stroke="#fff"
              strokeWidth={0.8}
              className="cursor-pointer transition-opacity"
              onMouseEnter={() => {
                onHoverPhase(null);
                onHoverX1(x1s.x1);
              }}
              onClick={(e) => {
                e.stopPropagation();
                onToggleX1(x1s.x1);
              }}
            />
          );
        }),
      )}

      {/* Outer ring — phase */}
      {phaseSegments.map((ps) => {
        const dim = phaseDim(ps.phase);
        const isHover = hoveredPhase === ps.phase;
        return (
          <path
            key={`phase-${ps.phase}`}
            d={arcPath(CX, CY, R_OUT_INNER, R_OUT_OUTER, ps.startAngle, ps.endAngle)}
            fill={phaseColors[ps.phase] ?? '#999'}
            fillOpacity={dim ? 0.15 : isHover ? 1 : 0.9}
            stroke="#fff"
            strokeWidth={1}
            className="cursor-pointer transition-opacity"
            onMouseEnter={() => {
              onHoverX1(null);
              onHoverPhase(ps.phase);
            }}
            onClick={(e) => {
              e.stopPropagation();
              onToggleType(ps.phase);
            }}
          />
        );
      })}

      {/* Center label */}
      <text
        x={CX}
        y={CY - 2}
        textAnchor="middle"
        style={{ fontSize: 15, fontWeight: 600, fill: '#000' }}
      >
        {anyFilter ? filteredCount : totalCount}
      </text>
      <text
        x={CX}
        y={CY + 10}
        textAnchor="middle"
        style={{ fontSize: 6, letterSpacing: 0.6, fill: 'rgba(0,0,0,0.45)' }}
      >
        {anyFilter ? `OF ${totalCount}` : 'STRATEGIES'}
      </text>
    </svg>
  );
}
