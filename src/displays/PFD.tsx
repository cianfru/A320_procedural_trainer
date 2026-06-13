import { useSimStore } from '../store/useSimStore';
import { DisplayUnit } from './DisplayUnit';
import { EIS } from './glass';
import type { FcuState, Kinematics } from '../sim/types';

/**
 * Primary Flight Display — faithful SVG layout off the store's kinematics + FCU.
 *
 * Implemented: attitude (pitch ladder, bank scale, roll pointer, slip),
 * speed tape, altitude tape, VSI, heading scale, and the FMA boxes.
 * The FMA TEXT is drawn from FCU mode booleans but the autoflight mode logic
 * behind it is stubbed (Stage 4 draws it, Stage 7 builds it — spec §4).
 */

// ── Geometry (in the 512×512 DU space) ───────────────────────────────────
const VC = 262; // common vertical centre for ADI + tapes
const CX = 236; // ADI / heading centre x
const ADI = { x0: 96, x1: 376, y0: 96, y1: 428 };
const PITCH_PX = 4.2; // px per degree of pitch

const SPD = { x0: 34, w: 58, top: 100, bot: 424, pxPerKt: 4.0 };
const ALT = { x0: 380, w: 74, top: 100, bot: 424, pxPerFt: 0.34 };
const VSI = { x: 460, pivotY: VC };
const HDG = { y: 450, halfW: 140, pxPerDeg: 4.6 };

export function PFD() {
  const k = useSimStore((s) => s.state.kinematics);
  const fcu = useSimStore((s) => s.state.fcu);
  return (
    <DisplayUnit label="PFD">
      <Fma fcu={fcu} />
      <Attitude k={k} />
      <SpeedTape k={k} fcu={fcu} />
      <AltTape k={k} fcu={fcu} />
      <Vsi vs={k.vsFpm} />
      <Heading k={k} fcu={fcu} />
    </DisplayUnit>
  );
}

// ── Attitude indicator ───────────────────────────────────────────────────
function Attitude({ k }: { k: Kinematics }) {
  const pitchOffset = k.pitch * PITCH_PX;
  const ladder: number[] = [-30, -20, -10, 10, 20, 30];
  return (
    <>
      <defs>
        <clipPath id="adi-clip">
          <rect x={ADI.x0} y={ADI.y0} width={ADI.x1 - ADI.x0} height={ADI.y1 - ADI.y0} />
        </clipPath>
      </defs>

      <g clipPath="url(#adi-clip)">
        <g transform={`rotate(${-k.bank} ${CX} ${VC})`}>
          <g transform={`translate(0 ${pitchOffset})`}>
            {/* sky / ground */}
            <rect x={CX - 600} y={VC - 1000} width={1200} height={1000} fill={EIS.sky} />
            <rect x={CX - 600} y={VC} width={1200} height={1000} fill={EIS.ground} />
            <line x1={CX - 600} y1={VC} x2={CX + 600} y2={VC} stroke="#fff" strokeWidth={2} />
            {/* pitch ladder */}
            {ladder.map((p) => {
              const y = VC - p * PITCH_PX;
              const half = p % 20 === 0 ? 46 : 28;
              return (
                <g key={p} stroke="#fff" strokeWidth={1.5}>
                  <line x1={CX - half} y1={y} x2={CX + half} y2={y} />
                  <text x={CX - half - 8} y={y + 5} fill="#fff" fontSize={13} textAnchor="end">
                    {Math.abs(p)}
                  </text>
                  <text x={CX + half + 8} y={y + 5} fill="#fff" fontSize={13}>
                    {Math.abs(p)}
                  </text>
                </g>
              );
            })}
          </g>
        </g>
      </g>

      {/* bank scale (fixed) */}
      <BankScale />
      {/* roll pointer (rotates with bank) */}
      <g transform={`rotate(${-k.bank} ${CX} ${VC})`}>
        <polygon
          points={`${CX},${ADI.y0 + 10} ${CX - 9},${ADI.y0 + 26} ${CX + 9},${ADI.y0 + 26}`}
          fill={EIS.amber}
        />
      </g>

      {/* fixed aircraft reference symbol */}
      <g stroke={EIS.amber} strokeWidth={4} fill="none">
        <path d={`M ${CX - 70} ${VC} h 34 v 14`} />
        <path d={`M ${CX + 70} ${VC} h -34 v 14`} />
      </g>
      <rect x={CX - 4} y={VC - 4} width={8} height={8} fill="none" stroke={EIS.amber} strokeWidth={3} />
    </>
  );
}

function BankScale() {
  const r = VC - ADI.y0 - 18;
  const angles = [-45, -30, -20, -10, 0, 10, 20, 30, 45];
  return (
    <g stroke="#fff" strokeWidth={1.5} fill="#fff">
      {angles.map((a) => {
        const rad = ((a - 90) * Math.PI) / 180;
        const len = a % 30 === 0 || a === 0 ? 14 : 9;
        const x1 = CX + r * Math.cos(rad);
        const y1 = VC + r * Math.sin(rad);
        const x2 = CX + (r + len) * Math.cos(rad);
        const y2 = VC + (r + len) * Math.sin(rad);
        return <line key={a} x1={x1} y1={y1} x2={x2} y2={y2} />;
      })}
    </g>
  );
}

// ── Speed tape ─────────────────────────────────────────────────────────
function SpeedTape({ k, fcu }: { k: Kinematics; fcu: FcuState }) {
  const yFor = (v: number) => VC - (v - k.ias) * SPD.pxPerKt;
  const lo = Math.ceil((k.ias - 44) / 10) * 10;
  const ticks: number[] = [];
  for (let v = Math.max(0, lo); v <= k.ias + 44; v += 10) ticks.push(v);

  const bugY = clamp(yFor(fcu.spd), SPD.top + 4, SPD.bot - 4);

  return (
    <>
      <clipPath id="spd-clip">
        <rect x={SPD.x0 - 4} y={SPD.top} width={SPD.w + 30} height={SPD.bot - SPD.top} />
      </clipPath>
      <rect x={SPD.x0} y={SPD.top} width={SPD.w} height={SPD.bot - SPD.top} fill={EIS.tape} opacity={0.55} />
      <g clipPath="url(#spd-clip)">
        {ticks.map((v) => (
          <g key={v} stroke="#fff">
            <line x1={SPD.x0 + SPD.w - 12} y1={yFor(v)} x2={SPD.x0 + SPD.w} y2={yFor(v)} strokeWidth={1.5} />
            <text x={SPD.x0 + SPD.w - 16} y={yFor(v) + 5} fill="#fff" fontSize={15} textAnchor="end">
              {v}
            </text>
          </g>
        ))}
        {/* selected-speed bug */}
        <polygon
          points={`${SPD.x0 + SPD.w},${bugY} ${SPD.x0 + SPD.w + 12},${bugY - 8} ${SPD.x0 + SPD.w + 12},${bugY + 8}`}
          fill={fcu.spdManaged ? EIS.magenta : EIS.cyan}
        />
      </g>
      {/* current speed readout window */}
      <polygon
        points={`${SPD.x0 - 4},${VC} ${SPD.x0 + 8},${VC - 18} ${SPD.x0 + SPD.w + 6},${VC - 18} ${SPD.x0 + SPD.w + 6},${VC + 18} ${SPD.x0 + 8},${VC + 18}`}
        fill="#000"
        stroke={EIS.amber}
        strokeWidth={2}
      />
      <text x={SPD.x0 + SPD.w + 2} y={VC + 7} fill={EIS.green} fontSize={24} textAnchor="end">
        {Math.round(k.ias)}
      </text>
      {/* Mach */}
      <text x={SPD.x0 + 6} y={SPD.bot + 24} fill={EIS.green} fontSize={18}>
        .{Math.round(k.mach * 100)}
      </text>
    </>
  );
}

// ── Altitude tape ────────────────────────────────────────────────────────
function AltTape({ k, fcu }: { k: Kinematics; fcu: FcuState }) {
  const yFor = (a: number) => VC - (a - k.altFt) * ALT.pxPerFt;
  const base = Math.round((k.altFt - 600) / 100) * 100;
  const ticks: number[] = [];
  for (let a = base; a <= k.altFt + 600; a += 100) ticks.push(a);

  const selY = clamp(yFor(fcu.alt), ALT.top + 4, ALT.bot - 4);

  return (
    <>
      <clipPath id="alt-clip">
        <rect x={ALT.x0 - 14} y={ALT.top} width={ALT.w + 18} height={ALT.bot - ALT.top} />
      </clipPath>
      <rect x={ALT.x0} y={ALT.top} width={ALT.w} height={ALT.bot - ALT.top} fill={EIS.tape} opacity={0.55} />
      <g clipPath="url(#alt-clip)">
        {ticks.map((a) => (
          <g key={a} stroke="#fff">
            <line x1={ALT.x0} y1={yFor(a)} x2={ALT.x0 + 10} y2={yFor(a)} strokeWidth={1.5} />
            {a % 500 === 0 && (
              <text x={ALT.x0 + 14} y={yFor(a) + 5} fill="#fff" fontSize={15}>
                {a}
              </text>
            )}
          </g>
        ))}
        {/* selected-altitude bug */}
        <polygon
          points={`${ALT.x0},${selY} ${ALT.x0 - 12},${selY - 8} ${ALT.x0 - 12},${selY + 8}`}
          fill={fcu.altManaged ? EIS.magenta : EIS.cyan}
        />
      </g>
      {/* current altitude readout window */}
      <rect x={ALT.x0 - 6} y={VC - 18} width={ALT.w + 10} height={36} fill="#000" stroke={EIS.amber} strokeWidth={2} />
      <text x={ALT.x0 + ALT.w} y={VC + 7} fill={EIS.green} fontSize={23} textAnchor="end">
        {Math.round(k.altFt)}
      </text>
      {/* selected altitude (top, cyan/magenta) */}
      <text
        x={ALT.x0 + ALT.w}
        y={ALT.top - 8}
        fill={fcu.altManaged ? EIS.magenta : EIS.cyan}
        fontSize={18}
        textAnchor="end"
      >
        {fcu.alt}
      </text>
    </>
  );
}

// ── Vertical speed indicator ───────────────────────────────────────────────
function vsToY(vs: number): number {
  const s = Math.sign(vs);
  const a = Math.min(Math.abs(vs), 6000);
  const d = a <= 1000 ? a * 0.06 : 60 + (a - 1000) * 0.018;
  return VSI.pivotY - s * d;
}

function Vsi({ vs }: { vs: number }) {
  const marks = [-6000, -2000, -1000, 1000, 2000, 6000];
  return (
    <>
      {marks.map((m) => (
        <g key={m}>
          <line x1={VSI.x} y1={vsToY(m)} x2={VSI.x + 8} y2={vsToY(m)} stroke="#fff" strokeWidth={1.5} />
          <text x={VSI.x + 12} y={vsToY(m) + 4} fill="#fff" fontSize={11}>
            {Math.abs(m) / 1000}
          </text>
        </g>
      ))}
      <line x1={VSI.x} y1={VSI.pivotY} x2={VSI.x + 40} y2={vsToY(vs)} stroke={EIS.green} strokeWidth={3} />
      {Math.abs(vs) >= 200 && (
        <text
          x={VSI.x + 6}
          y={vs > 0 ? vsToY(6000) - 6 : vsToY(-6000) + 16}
          fill={EIS.green}
          fontSize={13}
        >
          {Math.round(vs / 100) / 10}
        </text>
      )}
    </>
  );
}

// ── Heading scale ──────────────────────────────────────────────────────────
function Heading({ k, fcu }: { k: Kinematics; fcu: FcuState }) {
  const xFor = (h: number) => {
    let d = h - k.hdg;
    d = ((d + 540) % 360) - 180; // shortest signed delta
    return CX + d * HDG.pxPerDeg;
  };
  const base = Math.round((k.hdg - 30) / 10) * 10;
  const ticks: number[] = [];
  for (let h = base; h <= k.hdg + 30; h += 10) ticks.push(((h % 360) + 360) % 360);

  return (
    <>
      <clipPath id="hdg-clip">
        <rect x={CX - HDG.halfW} y={HDG.y - 14} width={HDG.halfW * 2} height={44} />
      </clipPath>
      <g clipPath="url(#hdg-clip)">
        {ticks.map((h) => (
          <g key={h} stroke="#fff">
            <line x1={xFor(h)} y1={HDG.y} x2={xFor(h)} y2={HDG.y + (h % 30 === 0 ? 12 : 7)} strokeWidth={1.5} />
            {h % 30 === 0 && (
              <text x={xFor(h)} y={HDG.y + 28} fill="#fff" fontSize={14} textAnchor="middle">
                {h / 10}
              </text>
            )}
          </g>
        ))}
        {/* selected heading bug */}
        <polygon
          points={`${xFor(fcu.hdg)},${HDG.y} ${xFor(fcu.hdg) - 7},${HDG.y - 10} ${xFor(fcu.hdg) + 7},${HDG.y - 10}`}
          fill={fcu.hdgManaged ? EIS.magenta : EIS.cyan}
        />
      </g>
      {/* current heading pointer */}
      <polygon points={`${CX},${HDG.y - 2} ${CX - 8},${HDG.y - 14} ${CX + 8},${HDG.y - 14}`} fill={EIS.green} />
    </>
  );
}

// ── FMA (drawn; mode logic stubbed) ────────────────────────────────────────
function Fma({ fcu }: { fcu: FcuState }) {
  const cols = [
    fcu.athr ? (fcu.spdManaged ? 'SPEED' : 'THR CLB') : '',
    fcu.altManaged ? 'ALT' : fcu.vsActive ? 'V/S' : 'ALT*',
    fcu.hdgManaged ? 'NAV' : 'HDG',
    fcu.appr ? 'CAT 1' : '',
    fcu.ap1 || fcu.ap2 ? `AP${fcu.ap1 ? '1' : ''}${fcu.ap2 ? '2' : ''}` : '',
  ];
  return (
    <g>
      <rect x={0} y={0} width={512} height={48} fill="#0a0a0a" />
      <line x1={0} y1={48} x2={512} y2={48} stroke={EIS.greyDark} strokeWidth={1} />
      {cols.map((t, i) => (
        <g key={i}>
          {i > 0 && <line x1={i * 102} y1={6} x2={i * 102} y2={42} stroke={EIS.greyDark} strokeWidth={1} />}
          <text x={i * 102 + 51} y={30} fill={i === 4 ? EIS.white : EIS.green} fontSize={16} textAnchor="middle">
            {t}
          </text>
        </g>
      ))}
    </g>
  );
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
