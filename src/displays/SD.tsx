import { useSimStore } from '../store/useSimStore';
import { DisplayUnit } from './DisplayUnit';
import { EIS } from './glass';
import { HYD, PRESS } from '../sim/constants';
import type { ElecState, HydSys, HydraulicsState, PressState } from '../sim/types';

/**
 * Lower SD (system display). Auto-called page follows fwc.sdPage. HYD, ELEC and
 * PRESS synoptics are drawn; remaining pages are placeholders pending their
 * system models + mockups.
 */
export function SD() {
  const page = useSimStore((s) => s.state.fwc.sdPage);
  const hyd = useSimStore((s) => s.state.hyd);
  const elec = useSimStore((s) => s.state.elec);
  const press = useSimStore((s) => s.state.press);

  return (
    <DisplayUnit label={`SD ${page}`}>
      <text x={256} y={26} fill={EIS.white} fontSize={16} textAnchor="middle">
        {page}
      </text>
      {page === 'HYD' ? (
        <HydSynoptic hyd={hyd} />
      ) : page === 'ELEC' ? (
        <ElecSynoptic elec={elec} />
      ) : page === 'PRESS' ? (
        <PressSynoptic press={press} />
      ) : (
        <Placeholder page={page} />
      )}
    </DisplayUnit>
  );
}

// ── PRESS synoptic ─────────────────────────────────────────────────────────
function PressSynoptic({ press }: { press: PressState }) {
  const alt = press.cabinAltFt;
  const altColor =
    alt >= PRESS.EXCESS_CAB_ALT_FT ? EIS.red : alt >= PRESS.CAB_ALT_PULSE_FT ? EIS.amber : EIS.green;
  const dpColor = press.diffPsi < -0.4 || press.diffPsi >= 8.5 ? EIS.amber : EIS.green;
  return (
    <>
      <Readout x={140} y={120} label="ΔP" unit="PSI" value={press.diffPsi.toFixed(1)} color={dpColor} />
      <Readout x={372} y={120} label="CAB ALT" unit="FT" value={String(Math.round(alt / 50) * 50)} color={altColor} />
      <Readout x={256} y={200} label="CAB V/S" unit="FT/MN" value={String(Math.round(press.cabinVsFpm / 50) * 50)} color={Math.abs(press.cabinVsFpm) > 1750 ? EIS.amber : EIS.green} />

      <PwrBox x={120} y={280} label="PACK 1" on={press.pack1} />
      <PwrBox x={300} y={280} label="PACK 2" on={press.pack2} />

      {press.paxMasksDeployed && (
        <text x={256} y={360} fill={EIS.amber} fontSize={15} fontWeight={700} textAnchor="middle">
          PAX OXY MASKS DEPLOYED
        </text>
      )}
      {alt >= PRESS.EXCESS_CAB_ALT_FT && (
        <text x={256} y={400} fill={EIS.red} fontSize={16} fontWeight={700} textAnchor="middle">
          EXCESS CAB ALT
        </text>
      )}
    </>
  );
}

function Readout({ x, y, label, unit, value, color }: { x: number; y: number; label: string; unit: string; value: string; color: string }) {
  return (
    <g textAnchor="middle">
      <text x={x} y={y - 22} fill={EIS.white} fontSize={13}>{label}</text>
      <text x={x} y={y + 6} fill={color} fontSize={26}>{value}</text>
      <text x={x} y={y + 24} fill={EIS.cyan} fontSize={11}>{unit}</text>
    </g>
  );
}

// ── ELEC synoptic ────────────────────────────────────────────────────────
function ElecSynoptic({ elec }: { elec: ElecState }) {
  return (
    <>
      {elec.emerConfig && (
        <text x={256} y={48} fill={EIS.red} fontSize={16} fontWeight={700} textAnchor="middle">
          EMER CONFIG
        </text>
      )}
      {/* generators */}
      <PwrBox x={70} y={70} label="GEN 1" on={elec.gen1.on && !elec.gen1.fault} />
      <PwrBox x={290} y={70} label="GEN 2" on={elec.gen2.on && !elec.gen2.fault} />
      <PwrBox x={180} y={70} label="APU GEN" on={elec.apuGen.on && elec.apuGen.available} dim />

      {/* AC busses */}
      <PwrBox x={70} y={150} label="AC 1" on={elec.acBus1} />
      <PwrBox x={290} y={150} label="AC 2" on={elec.acBus2} />
      <PwrBox x={180} y={150} label="AC ESS" on={elec.acEss} />
      {/* bus tie link */}
      <line x1={150} y1={166} x2={290} y2={166} stroke={elec.busTie ? EIS.green : EIS.greyDark} strokeWidth={2} strokeDasharray={elec.busTie ? '0' : '4 5'} />

      {/* TRs */}
      <PwrBox x={70} y={230} label="TR 1" on={elec.tr1} />
      <PwrBox x={290} y={230} label="TR 2" on={elec.tr2} />

      {/* DC busses */}
      <PwrBox x={70} y={310} label="DC 1" on={elec.dcBus1} />
      <PwrBox x={290} y={310} label="DC 2" on={elec.dcBus2} />
      <PwrBox x={180} y={310} label="DC ESS" on={elec.dcEss} />
      <PwrBox x={180} y={385} label="DC BAT" on={elec.dcBat} />

      {/* batteries */}
      <PwrBox x={70} y={385} label="BAT 1" on={elec.bat1.on} />
      <PwrBox x={290} y={385} label="BAT 2" on={elec.bat2.on} />

      {/* RAT */}
      <text x={420} y={170} fill={elec.ratDeployed ? EIS.green : EIS.greyDark} fontSize={13} textAnchor="middle">
        RAT
      </text>
      <text x={420} y={186} fill={elec.ratDeployed ? EIS.green : EIS.greyDark} fontSize={12} textAnchor="middle">
        {elec.ratDeployed ? 'OUT' : 'STOW'}
      </text>
    </>
  );
}

function PwrBox({ x, y, label, on, dim }: { x: number; y: number; label: string; on: boolean; dim?: boolean }) {
  const c = on ? EIS.green : EIS.amber;
  return (
    <g opacity={dim && !on ? 0.5 : 1}>
      <rect x={x} y={y} width={80} height={32} rx={2} fill="none" stroke={c} strokeWidth={1.5} />
      <text x={x + 40} y={y + 21} fill={c} fontSize={14} textAnchor="middle">
        {label}
      </text>
    </g>
  );
}

function HydSynoptic({ hyd }: { hyd: HydraulicsState }) {
  return (
    <>
      <HydCircuit name="GREEN" sys={hyd.green} cx={120} />
      <Ptu running={hyd.ptu.running} armed={hyd.ptu.armed} cx={256} />
      <HydCircuit name="BLUE" sys={hyd.blue} cx={256} dim />
      <HydCircuit name="YELLOW" sys={hyd.yellow} cx={392} />
    </>
  );
}

function HydCircuit({ name, sys, cx, dim }: { name: string; sys: HydSys; cx: number; dim?: boolean }) {
  const low = sys.pressurePsi < HYD.LO_PR_PSI;
  const c = low ? EIS.amber : EIS.green;
  const top = 70;
  const bot = 430;
  return (
    <g opacity={dim ? 0.9 : 1}>
      <text x={cx} y={top - 14} fill={EIS.white} fontSize={14} textAnchor="middle">
        {name[0]}
      </text>
      {/* circuit line */}
      <line x1={cx} y1={top} x2={cx} y2={bot} stroke={c} strokeWidth={low ? 2 : 3} />

      {/* pressure triangle (points up = pressurised) */}
      <polygon points={`${cx},${top + 6} ${cx - 12},${top + 26} ${cx + 12},${top + 26}`} fill="none" stroke={c} strokeWidth={2} />
      <text x={cx} y={top + 60} fill={c} fontSize={20} textAnchor="middle">
        {Math.round(sys.pressurePsi)}
      </text>
      <text x={cx} y={top + 78} fill={EIS.cyan} fontSize={11} textAnchor="middle">
        PSI
      </text>

      {/* pump */}
      <rect x={cx - 16} y={bot - 80} width={32} height={32} fill="none" stroke={sys.pumpOn ? EIS.green : EIS.amber} strokeWidth={2} />
      <text x={cx} y={bot - 58} fill={sys.pumpOn ? EIS.green : EIS.amber} fontSize={11} textAnchor="middle">
        {sys.pumpOn ? 'ON' : 'OFF'}
      </text>

      {/* reservoir */}
      <text x={cx} y={bot - 20} fill={EIS.green} fontSize={13} textAnchor="middle">
        RSVR {Math.round(sys.reservoirFrac * 100)}%
      </text>
    </g>
  );
}

function Ptu({ running, armed, cx }: { running: boolean; armed: boolean; cx: number }) {
  const c = running ? EIS.green : armed ? EIS.cyan : EIS.amber;
  return (
    <g>
      <text x={cx} y={250} fill={c} fontSize={13} textAnchor="middle">
        PTU
      </text>
      <text x={cx} y={268} fill={c} fontSize={12} textAnchor="middle">
        {running ? 'RUN' : armed ? 'AUTO' : 'OFF'}
      </text>
    </g>
  );
}

function Placeholder({ page }: { page: string }) {
  return (
    <text x={256} y={256} fill={EIS.greyDark} fontSize={15} textAnchor="middle">
      {page} synoptic — not yet implemented
    </text>
  );
}
