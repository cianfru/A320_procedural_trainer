import { useSimStore } from '../store/useSimStore';
import { DisplayUnit } from './DisplayUnit';
import { EIS } from './glass';
import { HYD } from '../sim/constants';
import type { HydSys, HydraulicsState } from '../sim/types';

/**
 * Lower SD (system display). Auto-called page follows fwc.sdPage. The HYD
 * synoptic is drawn; remaining pages are placeholders pending their system
 * models + mockups.
 */
export function SD() {
  const page = useSimStore((s) => s.state.fwc.sdPage);
  const hyd = useSimStore((s) => s.state.hyd);

  return (
    <DisplayUnit label={`SD ${page}`}>
      <text x={256} y={26} fill={EIS.white} fontSize={16} textAnchor="middle">
        {page === 'HYD' ? 'HYD' : page}
      </text>
      {page === 'HYD' ? <HydSynoptic hyd={hyd} /> : <Placeholder page={page} />}
    </DisplayUnit>
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
