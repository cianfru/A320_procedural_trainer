import { useState } from 'react';
import { useSimStore } from '../store/useSimStore';
import type { FcuField, FcuButton } from '../sim/types';

/**
 * FCU — the glareshield Flight Control Unit (captain side), drawn to match the
 * real A32NX unit: brushed-metal panel, copper-ringed knobs (the HDG knob
 * carries the blue track triangle), the small 100/1000 ALT-increment knob, the
 * V/S "PUSH TO LEVEL OFF" knob, and the SPD/HDG/ALT display windows with managed
 * dots and amber/white EIS lettering.
 *
 * Interaction model (mirrors the physical unit):
 *   - mouse wheel over a knob → dial the value (selects the channel)
 *   - click the knob ring     → PULL  (selected)
 *   - click the knob hub      → PUSH  (managed; V/S hub = level off)
 *   - mode buttons toggle      → crew actions through the event log
 *
 * Autoflight that flies these targets is Stage 7; here they display + store.
 */

const C = {
  panel0: '#3a4650',
  panel1: '#222b32',
  edge: '#10161a',
  screw: '#8d97a0',
  amber: '#e8a317',
  white: '#f2f4f6',
  green: '#23e000',
  divider: '#11171c',
  btnFace: '#0c0f12',
  btnEdge: '#39434c',
  label: '#c7ced4',
};

export function FCU() {
  const fcu = useSimStore((s) => s.state.fcu);
  const send = useSimStore((s) => s.sendCrewAction);
  // ALT increment selector (100/1000) is FCU panel UI state, not sim state.
  const [altStep, setAltStep] = useState<100 | 1000>(1000);

  const set = (field: FcuField, delta: number) => send({ kind: 'FCU_SET', field, delta });
  const push = (field: FcuField) => send({ kind: 'FCU_PUSH', field });
  const pull = (field: FcuField) => send({ kind: 'FCU_PULL', field });
  const mode = (field: 'spd' | 'hdg') => send({ kind: 'FCU_MODE', field });
  const btn = (button: FcuButton) => send({ kind: 'FCU_BUTTON', button });

  return (
    <div className="fcu">
      <svg viewBox="0 0 880 300" className="fcu-svg" role="img" aria-label="FCU">
        <defs>
          <linearGradient id="fcu-panel" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={C.panel0} />
            <stop offset="0.5" stopColor={C.panel1} />
            <stop offset="1" stopColor="#1a2127" />
          </linearGradient>
          <radialGradient id="fcu-knob" cx="0.38" cy="0.32" r="0.75">
            <stop offset="0" stopColor="#f4f6f8" />
            <stop offset="0.55" stopColor="#c2cace" />
            <stop offset="0.85" stopColor="#7e878d" />
            <stop offset="1" stopColor="#565d63" />
          </radialGradient>
          <radialGradient id="fcu-copper" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0.74" stopColor="#0000" />
            <stop offset="0.78" stopColor="#c9772f" />
            <stop offset="0.92" stopColor="#94531c" />
            <stop offset="1" stopColor="#5e340f" />
          </radialGradient>
          <radialGradient id="fcu-screw" cx="0.4" cy="0.35" r="0.7">
            <stop offset="0" stopColor="#c2c9cf" />
            <stop offset="1" stopColor="#5b646b" />
          </radialGradient>
          <linearGradient id="fcu-window" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#05080a" />
            <stop offset="1" stopColor="#0c1115" />
          </linearGradient>
        </defs>

        {/* panel */}
        <rect x={4} y={4} width={872} height={292} rx={10} fill={C.edge} />
        <rect x={8} y={8} width={864} height={284} rx={8} fill="url(#fcu-panel)" />

        {/* section dividers */}
        {[348, 520, 718].map((x) => (
          <line key={x} x1={x} y1={20} x2={x} y2={280} stroke={C.divider} strokeWidth={2} />
        ))}

        {/* corner + divider screws */}
        {[
          [24, 24], [856, 24], [24, 276], [856, 276],
          [348, 16], [520, 16], [718, 16], [348, 286], [520, 286], [718, 286],
        ].map(([x, y], i) => (
          <Screw key={i} x={x} y={y} />
        ))}

        {/* ── display window ── */}
        <rect x={92} y={30} width={700} height={56} rx={4} fill="url(#fcu-window)" stroke="#000" />

        {/* SPD */}
        <text x={108} y={50} fill={C.amber} fontSize={15} fontWeight={700}>SPD</text>
        <ValueOrDashes x={108} managed={fcu.spdManaged} value={Math.round(fcu.spd)} />

        {/* HDG / LAT */}
        <text x={210} y={50} fill={C.amber} fontSize={15} fontWeight={700}>HDG</text>
        <text x={300} y={50} fill={C.amber} fontSize={15} fontWeight={700}>LAT</text>
        <ValueOrDashes x={210} managed={fcu.hdgManaged} value={pad(Math.round(fcu.hdg), 3)} />

        {/* centre mode annunciation */}
        <text x={378} y={74} fill={C.green} fontSize={15} fontWeight={700}>
          {fcu.hdgMode}
        </text>
        <rect x={428} y={58} width={4} height={18} fill={C.label} />
        <rect x={436} y={58} width={4} height={18} fill={C.label} />
        <text x={448} y={74} fill={C.green} fontSize={15} fontWeight={700}>V/S</text>

        {/* ALT */}
        <text x={560} y={50} fill={C.amber} fontSize={15} fontWeight={700}>ALT</text>
        <text x={604} y={48} fill={C.amber} fontSize={12} fontWeight={700}>—LVL/CH—</text>
        <text x={700} y={50} fill={C.amber} fontSize={15} fontWeight={700}>V/S</text>
        <text x={560} y={78} fill={C.white} fontSize={26} fontWeight={700} letterSpacing="2">
          {pad(fcu.alt, 5)}
        </text>
        <Dot x={690} y={70} on />
        <text x={704} y={78} fill={C.amber} fontSize={18} fontWeight={700}>
          {fcu.vsActive ? signed(fcu.vs) : '- - - -'}
        </text>

        {/* ── SPD section ── */}
        <RoundButton x={44} y={150} label="SPD" sub="MACH" on={fcu.spdMode === 'MACH'} onClick={() => mode('spd')} />
        <Knob cx={150} cy={185} field="spd" step={1} onSet={set} onPush={push} onPull={pull} />

        {/* ── HDG section ── */}
        <Knob cx={300} cy={185} field="hdg" step={1} triangle onSet={set} onPush={push} onPull={pull} />
        <SquareButton x={258} y={250} w={64} label="LOC" on={fcu.loc} onClick={() => btn('loc')} />

        {/* ── centre buttons ── */}
        <RoundButton x={388} y={132} label="HDG" sub="TRK" on={fcu.hdgMode === 'TRK'} onClick={() => mode('hdg')} />
        <RoundButton x={452} y={132} label="V/S" sub="FPA" on={false} onClick={() => pull('vs')} />
        <SquareButton x={364} y={170} w={52} label="AP1" on={fcu.ap1} onClick={() => btn('ap1')} />
        <SquareButton x={424} y={170} w={52} label="AP2" on={fcu.ap2} onClick={() => btn('ap2')} />
        <SquareButton x={392} y={236} w={64} label="A/THR" on={fcu.athr} green onClick={() => btn('athr')} />

        {/* ── ALT section ── */}
        <SmallKnob
          cx={560}
          cy={185}
          label={String(altStep)}
          onClick={() => setAltStep((s) => (s === 100 ? 1000 : 100))}
        />
        <Knob cx={636} cy={185} field="alt" step={altStep} onSet={set} onPush={push} onPull={pull} />
        <RoundButton x={684} y={150} label="METRIC" sub="ALT" on={false} onClick={() => {}} />

        {/* ── V/S section ── */}
        <Knob cx={790} cy={185} field="vs" step={100} vs onSet={set} onPush={push} onPull={pull} />
        <text x={838} y={150} fill={C.label} fontSize={9} fontWeight={700}>PUSH</text>
        <text x={836} y={162} fill={C.label} fontSize={9} fontWeight={700}>TO</text>
        <text x={826} y={174} fill={C.label} fontSize={9} fontWeight={700}>LEVEL</text>
        <text x={832} y={186} fill={C.label} fontSize={9} fontWeight={700}>OFF</text>

        <SquareButton x={596} y={250} w={64} label="EXPED" on={fcu.exped} onClick={() => btn('exped')} />
        <SquareButton x={750} y={250} w={64} label="APPR" on={fcu.appr} onClick={() => btn('appr')} />
      </svg>
    </div>
  );
}

// ── pieces ────────────────────────────────────────────────────────────────

function ValueOrDashes({ x, managed, value }: { x: number; managed: boolean; value: number | string }) {
  return managed ? (
    <>
      <text x={x} y={76} fill={C.amber} fontSize={20} fontWeight={700} letterSpacing="3">
        - - -
      </text>
      <Dot x={x + 64} y={70} on />
    </>
  ) : (
    <text x={x} y={78} fill={C.green} fontSize={22} fontWeight={700} letterSpacing="2">
      {value}
    </text>
  );
}

function Dot({ x, y, on }: { x: number; y: number; on: boolean }) {
  return <circle cx={x} cy={y - 6} r={6} fill={on ? C.amber : '#3a2c10'} />;
}

function Screw({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={6} fill="url(#fcu-screw)" stroke="#2a3036" strokeWidth={1} />
      <line x1={x - 4} y1={y} x2={x + 4} y2={y} stroke="#3a4248" strokeWidth={1.4} transform={`rotate(35 ${x} ${y})`} />
    </g>
  );
}

interface KnobProps {
  cx: number;
  cy: number;
  field: FcuField;
  step: number;
  triangle?: boolean;
  vs?: boolean;
  onSet: (f: FcuField, d: number) => void;
  onPush: (f: FcuField) => void;
  onPull: (f: FcuField) => void;
}

function Knob({ cx, cy, field, step, triangle, vs, onSet, onPush, onPull }: KnobProps) {
  const r = 36;
  return (
    <g
      style={{ cursor: 'pointer' }}
      onWheel={(e) => onSet(field, (e.deltaY < 0 ? 1 : -1) * step)}
    >
      <circle cx={cx} cy={cy} r={r + 5} fill="url(#fcu-copper)" />
      {/* ring = PULL (selected) */}
      <circle cx={cx} cy={cy} r={r} fill="url(#fcu-knob)" stroke="#4c5358" strokeWidth={1} onClick={() => onPull(field)} />
      {/* hub = PUSH (managed / level off) */}
      <circle cx={cx} cy={cy} r={13} fill="#aeb6bb" stroke="#6a7176" strokeWidth={1} onClick={() => onPush(field)} />
      {triangle && (
        <polygon
          points={`${cx},${cy - 9} ${cx - 8},${cy + 6} ${cx + 8},${cy + 6}`}
          fill="#2f7dd1"
          stroke="#1b5fa8"
          strokeWidth={1}
        />
      )}
      {vs && (
        <>
          <text x={cx} y={cy - r - 6} fill={C.label} fontSize={11} fontWeight={700} textAnchor="middle">UP</text>
          <text x={cx} y={cy + r + 15} fill={C.label} fontSize={11} fontWeight={700} textAnchor="middle">DN</text>
        </>
      )}
    </g>
  );
}

function SmallKnob({ cx, cy, label, onClick }: { cx: number; cy: number; label: string; onClick: () => void }) {
  return (
    <g style={{ cursor: 'pointer' }} onClick={onClick}>
      <text x={cx - 16} y={cy - 26} fill={C.label} fontSize={11} fontWeight={700}>100</text>
      <text x={cx + 2} y={cy - 26} fill={C.label} fontSize={11} fontWeight={700}>1000</text>
      <circle cx={cx} cy={cy} r={22} fill="url(#fcu-copper)" />
      <circle cx={cx} cy={cy} r={17} fill="url(#fcu-knob)" stroke="#4c5358" strokeWidth={1} />
      <rect x={cx - 2} y={cy - 17} width={4} height={12} fill={label === '100' ? '#2f7dd1' : '#444'} />
    </g>
  );
}

function RoundButton({
  x, y, label, sub, on, onClick,
}: { x: number; y: number; label: string; sub: string; on: boolean; onClick: () => void }) {
  return (
    <g style={{ cursor: 'pointer' }} onClick={onClick}>
      <circle cx={x} cy={y} r={15} fill={C.btnFace} stroke={on ? C.green : C.btnEdge} strokeWidth={on ? 2 : 1} />
      {on && <circle cx={x} cy={y} r={4} fill={C.green} />}
      <text x={x} y={y + 30} fill={C.label} fontSize={10} fontWeight={700} textAnchor="middle">{label}</text>
      <text x={x} y={y + 41} fill={C.label} fontSize={10} fontWeight={700} textAnchor="middle">{sub}</text>
    </g>
  );
}

function SquareButton({
  x, y, w, label, on, green, onClick,
}: { x: number; y: number; w: number; label: string; on: boolean; green?: boolean; onClick: () => void }) {
  const h = 30;
  const lit = on && green;
  return (
    <g style={{ cursor: 'pointer' }} onClick={onClick}>
      <rect x={x} y={y} width={w} height={h} rx={3} fill={lit ? '#0d4d0d' : C.btnFace} stroke={on ? (green ? C.green : '#cfd6db') : C.btnEdge} strokeWidth={on ? 2 : 1} />
      <text x={x + w / 2} y={y + h / 2 + 5} fill={lit ? C.green : on ? '#fff' : C.label} fontSize={13} fontWeight={700} textAnchor="middle">
        {label}
      </text>
    </g>
  );
}

const pad = (n: number, w: number) => String(n).padStart(w, '0');
const signed = (n: number) => (n >= 0 ? `+${n}` : `${n}`);
