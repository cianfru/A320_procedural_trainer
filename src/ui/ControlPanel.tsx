import { useSimStore } from '../store/useSimStore';

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
        <button onClick={() => injectFailure({ kind: 'G_ENG1_PUMP_LOPR' })}>
          GREEN ENG1 PUMP LO PR
        </button>
        <button
          onClick={() =>
            injectFailure({ kind: 'G_HYD_LEAK', reservoirDrainFracPerMin: 0.25 })
          }
        >
          GREEN HYD LEAK
        </button>
        <button
          onClick={() =>
            injectFailure({ kind: 'RAPID_DEPRESS', cabinClimbFpm: 6000 })
          }
        >
          RAPID DEPRESS
        </button>
        <button onClick={() => injectFailure({ kind: 'ENG_FIRE', engine: 1 })}>
          ENG 1 FIRE
        </button>
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
    </div>
  );
}
