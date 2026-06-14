import { useSimStore } from '../store/useSimStore';
import { RUNNABLE_FAILURES } from '../sim/catalog/registry';
import type { SystemId } from '../sim/catalog/types';

/**
 * Instructor / failure-injection panel + sim transport. Every button maps to a
 * single event in the shared vocabulary (CrewAction or ActiveFailure) and goes
 * through the store's queue — exactly the same path a scenario timeline uses.
 *
 * This is also the seam the Stage 3 guidance layer will hook into (highlight
 * the expected next action).
 */
export function ControlPanel() {
  const running = useSimStore((s) => s.running);
  const t = useSimStore((s) => s.state.clock.t);
  const greenPump = useSimStore((s) => s.state.hyd.green.pumpOn);
  const gen1On = useSimStore((s) => s.state.elec.gen1.on);
  const gen2On = useSimStore((s) => s.state.elec.gen2.on);
  const { start, stop, reset, injectFailure, sendCrewAction } = useSimStore();

  return (
    <div className="control-panel">
      <div className="cp-section">
        <h3>SIM</h3>
        <div className="cp-clock">t = {t.toFixed(1)} s</div>
        <div className="cp-row">
          {running ? (
            <button onClick={stop}>Pause</button>
          ) : (
            <button onClick={start}>Run</button>
          )}
          <button onClick={reset}>Reset</button>
        </div>
      </div>

      <div className="cp-section">
        <h3>FAILURES</h3>
        {groupBySystem(RUNNABLE_FAILURES).map(([system, entries]) => (
          <div key={system} className="cp-group">
            <div className="cp-group-label">{system}</div>
            {entries.map((e) => (
              <button
                key={e.id}
                title={`ATA ${e.ata} · ${e.status}`}
                onClick={() => injectFailure(e.build!())}
              >
                {e.title.replace(/^[A-Z/]+:\s*/, '')}
              </button>
            ))}
          </div>
        ))}
      </div>

      <div className="cp-section">
        <h3>CREW</h3>
        <button
          onClick={() =>
            sendCrewAction({ kind: 'HYD_PUMP', sys: 'green', on: !greenPump })
          }
        >
          GREEN PUMP {greenPump ? 'OFF' : 'ON'}
        </button>
        <div className="cp-row">
          <button onClick={() => sendCrewAction({ kind: 'ELEC_GEN', gen: 1, on: !gen1On })}>
            GEN 1 {gen1On ? 'OFF' : 'ON'}
          </button>
          <button onClick={() => sendCrewAction({ kind: 'ELEC_GEN', gen: 2, on: !gen2On })}>
            GEN 2 {gen2On ? 'OFF' : 'ON'}
          </button>
        </div>
        <button onClick={() => sendCrewAction({ kind: 'ELEC_APU_GEN', on: true })}>
          APU GEN ON
        </button>
        <button onClick={() => sendCrewAction({ kind: 'ECAM_ACK_LINE' })}>
          ECAM ACTIONS — OVERFLY LINE
        </button>
        <div className="cp-row">
          <button onClick={() => sendCrewAction({ kind: 'ECAM_CLR' })}>
            CLR
          </button>
          <button onClick={() => sendCrewAction({ kind: 'ECAM_RECALL' })}>
            RCL
          </button>
        </div>
        <div className="cp-row">
          <button onClick={() => sendCrewAction({ kind: 'MASTER_WARN_ACK' })}>
            ACK WARN
          </button>
          <button onClick={() => sendCrewAction({ kind: 'MASTER_CAUT_ACK' })}>
            ACK CAUT
          </button>
        </div>
      </div>

      <div className="cp-section">
        <h3>EMER DESCENT</h3>
        <button onClick={() => sendCrewAction({ kind: 'CREW_OXY', on: true })}>
          CREW OXY MASKS
        </button>
        <button onClick={() => sendCrewAction({ kind: 'SIGNS_ON' })}>SIGNS ON</button>
        <button onClick={() => sendCrewAction({ kind: 'SET_VS', fpm: -6000 })}>
          INITIATE DESCENT
        </button>
        <button onClick={() => sendCrewAction({ kind: 'THR_IDLE' })}>THR IDLE</button>
        <button onClick={() => sendCrewAction({ kind: 'SPEEDBRAKE', value: 1 })}>
          SPD BRK FULL
        </button>
        <button onClick={() => sendCrewAction({ kind: 'ENG_MODE_IGN', on: true })}>
          ENG MODE IGN
        </button>
      </div>
    </div>
  );
}

/** Group runnable failures by system for a tidy, ATA-ordered menu. */
function groupBySystem<T extends { system: SystemId }>(
  entries: T[],
): Array<[SystemId, T[]]> {
  const map = new Map<SystemId, T[]>();
  for (const e of entries) {
    const list = map.get(e.system) ?? [];
    list.push(e);
    map.set(e.system, list);
  }
  return [...map.entries()];
}
