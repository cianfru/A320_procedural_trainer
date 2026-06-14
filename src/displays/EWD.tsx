import type { ReactNode } from 'react';
import { useSimStore } from '../store/useSimStore';
import { DisplayUnit } from './DisplayUnit';
import { EIS } from './glass';
import { PROCEDURES } from '../sim/fwc/procedures';
import { activeLineId } from '../sim/fwc/ecamActions';
import { ENG } from '../sim/constants';
import type { EcamColor, EngineState, FwcState } from '../sim/types';

/**
 * Upper E/WD — engine N1/EGT round gauges + secondary params on top, then the
 * warning/caution + ECAM ACTIONS region below. Pure render of state + FWC slice
 * (no logic here, spec §2 layer 6).
 */
const ITEM_COLOR: Record<EcamColor, string> = {
  WARNING: EIS.red,
  CAUTION: EIS.amber,
  ADVISORY: EIS.cyan,
};

export function EWD() {
  const engines = useSimStore((s) => s.state.engines);
  const fwc = useSimStore((s) => s.state.fwc);

  return (
    <DisplayUnit label="E/WD">
      {/* MASTER lights */}
      <MasterLight x={8} on={fwc.masterWarn} label="WARN" color={EIS.red} />
      <MasterLight x={440} on={fwc.masterCaut} label="CAUT" color={EIS.amber} />

      {/* engine gauges */}
      {engines.map((e, i) => (
        <EngineColumn key={i} eng={e} cx={i === 0 ? 156 : 356} idx={i + 1} />
      ))}

      {/* separator */}
      <line x1={20} y1={262} x2={492} y2={262} stroke={EIS.greyDark} strokeWidth={1} />

      {/* ECAM warning / actions region */}
      <EcamRegion fwc={fwc} />
    </DisplayUnit>
  );
}

function MasterLight({ x, on, label, color }: { x: number; on: boolean; label: string; color: string }) {
  return (
    <g opacity={on ? 1 : 0.25}>
      <rect x={x} y={8} width={64} height={30} rx={3} fill={on ? color : '#000'} stroke={color} strokeWidth={2} />
      <text x={x + 32} y={28} fill={on ? '#000' : color} fontSize={13} textAnchor="middle">
        MASTER
      </text>
      <text x={x + 32} y={52} fill={color} fontSize={11} textAnchor="middle">
        {label}
      </text>
    </g>
  );
}

// ── Engine column: N1 gauge, EGT gauge, N2 + FF digital ────────────────────
function EngineColumn({ eng, cx, idx }: { eng: EngineState; cx: number; idx: number }) {
  return (
    <g>
      <text x={cx} y={20} fill={EIS.white} fontSize={13} textAnchor="middle">
        ENG {idx}
      </text>
      <Gauge cx={cx} cy={92} r={50} min={0} max={110} redline={ENG.N1_MAX_PCT} value={eng.n1} label="N1" />
      <Gauge cx={cx} cy={196} r={40} min={0} max={1100} redline={ENG.EGT_TO_MAX_C} value={eng.egt} label="EGT" />
      <Digital cx={cx} y={244} label="N2" value={Math.round(eng.n2)} />
      <Digital cx={cx} y={256} label="FF" value={Math.round(eng.ff)} />
    </g>
  );
}

/** Polar point, degrees clockwise from 12 o'clock. */
function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.sin(rad), y: cy - r * Math.cos(rad) };
}

const START = 235; // gauge sweep start (lower-left)
const SWEEP = 250; // degrees, clockwise over the top

function Gauge({
  cx,
  cy,
  r,
  min,
  max,
  redline,
  value,
  label,
}: {
  cx: number;
  cy: number;
  r: number;
  min: number;
  max: number;
  redline: number;
  value: number;
  label: string;
}) {
  const frac = (v: number) => clamp((v - min) / (max - min), 0, 1);
  const deg = (v: number) => START + frac(v) * SWEEP;
  const a = polar(cx, cy, r, START);
  const b = polar(cx, cy, r, START + SWEEP);
  const redA = polar(cx, cy, r, deg(redline));
  const needle = polar(cx, cy, r - 4, deg(value));
  const over = value >= redline;

  return (
    <g>
      <path
        d={`M ${a.x} ${a.y} A ${r} ${r} 0 1 1 ${b.x} ${b.y}`}
        fill="none"
        stroke={EIS.white}
        strokeWidth={2}
      />
      {/* redline band */}
      <path
        d={`M ${redA.x} ${redA.y} A ${r} ${r} 0 0 1 ${b.x} ${b.y}`}
        fill="none"
        stroke={EIS.red}
        strokeWidth={3}
      />
      {/* needle */}
      <line x1={cx} y1={cy} x2={needle.x} y2={needle.y} stroke={over ? EIS.red : EIS.green} strokeWidth={3} />
      <circle cx={cx} cy={cy} r={3} fill={EIS.white} />
      {/* digital readout */}
      <rect x={cx - 30} y={cy + r - 18} width={60} height={26} fill="#000" stroke={EIS.greyDark} strokeWidth={1} />
      <text x={cx + 26} y={cy + r} fill={over ? EIS.red : EIS.green} fontSize={20} textAnchor="end">
        {Math.round(value)}
      </text>
      <text x={cx} y={cy - r - 6} fill={EIS.cyan} fontSize={12} textAnchor="middle">
        {label}
      </text>
    </g>
  );
}

function Digital({ cx, y, label, value }: { cx: number; y: number; label: string; value: number }) {
  return (
    <g>
      <text x={cx - 34} y={y} fill={EIS.cyan} fontSize={12} textAnchor="end">
        {label}
      </text>
      <text x={cx + 40} y={y} fill={EIS.green} fontSize={15} textAnchor="end">
        {value}
      </text>
    </g>
  );
}

// ── ECAM warning / ACTIONS region ──────────────────────────────────────────
function EcamRegion({ fwc }: { fwc: FwcState }) {
  let y = 286;
  const lh = 22;
  const rows: ReactNode[] = [];

  if (fwc.active.length === 0 && fwc.cleared.length === 0) {
    rows.push(
      <text key="normal" x={28} y={y} fill={EIS.green} fontSize={16}>
        NORMAL
      </text>,
    );
  }

  for (const item of fwc.active) {
    rows.push(
      <text key={item.id} x={24} y={y} fill={ITEM_COLOR[item.color]} fontSize={17}>
        {item.title}
      </text>,
    );
    y += lh;

    const proc = PROCEDURES[item.id];
    if (proc) {
      const done = new Set(fwc.procedures[item.id]?.completedLineIds ?? []);
      const next = activeLineId(fwc, item.id);
      for (const line of proc.lines) {
        const isDone = done.has(line.id);
        const isNext = line.id === next;
        rows.push(
          <text
            key={`${item.id}-${line.id}`}
            x={44}
            y={y}
            fill={isDone ? EIS.greyDark : EIS.cyan}
            fontSize={15}
            style={isDone ? { textDecoration: 'line-through' } : undefined}
          >
            {isNext ? '▸ ' : '  '}
            {line.text}
          </text>,
        );
        y += lh - 3;
      }
    }
    y += 6;
  }

  if (fwc.cleared.length > 0) {
    rows.push(
      <text key="status" x={24} y={y} fill={EIS.greyDark} fontSize={12}>
        …{fwc.cleared.length} in STATUS
      </text>,
    );
  }

  return <>{rows}</>;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
