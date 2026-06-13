import { useSimStore } from '../store/useSimStore';
import { HYD } from '../sim/constants';
import type { HydSys } from '../sim/types';

/**
 * Lower SD — system display. Auto-called page follows fwc.sdPage. For Stage 1
 * the HYD page is implemented; other pages are placeholders.
 */
export function SD() {
  const page = useSimStore((s) => s.state.fwc.sdPage);

  return (
    <div className="display sd">
      <div className="display-title">SD · {page}</div>
      {page === 'HYD' ? <HydPage /> : <PlaceholderPage page={page} />}
    </div>
  );
}

function HydPage() {
  const hyd = useSimStore((s) => s.state.hyd);
  return (
    <div className="sd-hyd">
      <HydColumn name="GREEN" sys={hyd.green} />
      <div className="ptu">
        PTU
        <div className={`ptu-state ${hyd.ptu.running ? 'run' : ''}`}>
          {hyd.ptu.running ? 'RUN' : hyd.ptu.armed ? 'AUTO' : 'OFF'}
        </div>
      </div>
      <HydColumn name="BLUE" sys={hyd.blue} />
      <HydColumn name="YELLOW" sys={hyd.yellow} />
    </div>
  );
}

function HydColumn({ name, sys }: { name: string; sys: HydSys }) {
  const low = sys.pressurePsi < HYD.LO_PR_PSI;
  return (
    <div className="hyd-col">
      <div className="hyd-name">{name}</div>
      <div className={`hyd-psi ${low ? 'low' : 'ok'}`}>
        {Math.round(sys.pressurePsi)}
      </div>
      <div className="hyd-unit">PSI</div>
      <div className="hyd-res">RSVR {Math.round(sys.reservoirFrac * 100)}%</div>
      <div className={`hyd-pump ${sys.pumpOn ? 'on' : 'off'}`}>
        PUMP {sys.pumpOn ? 'ON' : 'OFF'}
      </div>
    </div>
  );
}

function PlaceholderPage({ page }: { page: string }) {
  return <div className="sd-placeholder">{page} page — not yet implemented</div>;
}
