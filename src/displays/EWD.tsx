import { useSimStore } from '../store/useSimStore';
import type { EcamColor } from '../sim/types';

/**
 * Upper E/WD — engine row (top) + warning/caution + memo (bottom).
 *
 * Pure render of state + FWC slice (spec §2 layer 6). No logic here: the items
 * shown are whatever the FWC raised from aircraft state. The MASTER WARN/CAUT
 * lights reflect the latched FWC flags.
 */
const COLOR: Record<EcamColor, string> = {
  WARNING: '#ff3b30',
  CAUTION: '#ffcc00',
  ADVISORY: '#00e0e0',
};

export function EWD() {
  const engines = useSimStore((s) => s.state.engines);
  const fwc = useSimStore((s) => s.state.fwc);

  return (
    <div className="display ewd">
      <div className="display-title">E/WD</div>

      <div className="ewd-engines">
        {engines.map((e, i) => (
          <div key={i} className="engine-col">
            <div className="engine-label">ENG {i + 1}</div>
            <div className="engine-val n1">{e.n1.toFixed(1)}</div>
            <div className="engine-unit">N1 %</div>
            <div className="engine-val egt">{Math.round(e.egt)}</div>
            <div className="engine-unit">EGT °C</div>
            <div className="engine-val">{e.n2.toFixed(1)}</div>
            <div className="engine-unit">N2 %</div>
            <div className="engine-val">{Math.round(e.ff)}</div>
            <div className="engine-unit">FF KG/H</div>
          </div>
        ))}
      </div>

      <div className="ewd-masters">
        <span className={`master-light warn ${fwc.masterWarn ? 'on' : ''}`}>
          MASTER WARN
        </span>
        <span className={`master-light caut ${fwc.masterCaut ? 'on' : ''}`}>
          MASTER CAUT
        </span>
      </div>

      <div className="ewd-ecam">
        {fwc.active.length === 0 && fwc.cleared.length === 0 && (
          <div className="ecam-memo">NORMAL</div>
        )}
        {fwc.active.map((item) => (
          <div
            key={item.id}
            className="ecam-line"
            style={{ color: COLOR[item.color] }}
          >
            {item.title}
          </div>
        ))}
        {fwc.cleared.length > 0 && (
          <div className="ecam-status-hint">…{fwc.cleared.length} in STATUS</div>
        )}
      </div>
    </div>
  );
}
