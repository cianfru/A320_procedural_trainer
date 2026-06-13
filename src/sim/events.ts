import type { AircraftState, CrewAction, ActiveFailure, SimEvent } from './types';
import { PROCEDURES } from './fwc/procedures';

/**
 * Event apply — tick step 1 (spec §2.1).
 *
 * The ONLY writer of discrete conditions, rates and targets (write-ownership
 * contract, §2.2). Crew actions and failure injections both flow through here.
 * Mutates `state` in place (the store hands us a draft copy each tick).
 *
 * Note the invariant: a failure sets conditions/rates, never consequences.
 * `G_ENG1_PUMP_LOPR` turns the GREEN pump off — it does NOT set pressure to
 * zero or raise a caution. Derivation drops the pressure; the FWC raises the
 * caution. That is what lets one engine serve every scenario.
 */
export function applyEvent(state: AircraftState, event: SimEvent): void {
  if (event.kind === 'CREW_ACTION') {
    applyCrewAction(state, event.action);
  } else {
    applyFailure(state, event.failure);
  }
}

function applyCrewAction(state: AircraftState, action: CrewAction): void {
  switch (action.kind) {
    case 'HYD_PUMP':
      state.hyd[action.sys].pumpOn = action.on;
      break;
    case 'PTU_ARM':
      state.hyd.ptu.armed = action.armed;
      break;
    case 'MASTER_WARN_ACK':
      state.fwc.masterWarn = false;
      break;
    case 'MASTER_CAUT_ACK':
      state.fwc.masterCaut = false;
      break;
    case 'ECAM_CLR': {
      // Move the top active item to the cleared (STATUS) stack.
      const item = state.fwc.active.shift();
      if (item) state.fwc.cleared.push(item);
      break;
    }
    case 'ECAM_RECALL': {
      // Pull everything back from STATUS into the active list.
      state.fwc.active.push(...state.fwc.cleared);
      state.fwc.cleared = [];
      break;
    }
    case 'ECAM_ACK_LINE':
      ackTopManualLine(state);
      break;
  }
}

/**
 * Overfly the next MANUAL action line of the top active ECAM procedure. SENSED
 * lines are never acked here — they clear from state in the actions reducer.
 */
function ackTopManualLine(state: AircraftState): void {
  const top = state.fwc.active[0];
  if (!top) return;
  const proc = PROCEDURES[top.id];
  if (!proc) return;

  const progress = state.fwc.procedures[top.id] ?? {
    completedLineIds: [],
    complete: false,
  };
  const done = new Set(progress.completedLineIds);
  const next = proc.lines.find((l) => l.type === 'MANUAL' && !done.has(l.id));
  if (!next) return;

  done.add(next.id);
  state.fwc.procedures[top.id] = {
    completedLineIds: [...done],
    complete: proc.lines.every((l) => done.has(l.id)),
  };
}

function applyFailure(state: AircraftState, failure: ActiveFailure): void {
  // Avoid stacking exact-duplicate failures (same kind + same target).
  if (!state.failures.some((f) => sameFailure(f, failure))) {
    state.failures.push(failure);
  }

  switch (failure.kind) {
    case 'HYD_PUMP_LOPR':
      // Pump loses pressure: model as the pump being off.
      state.hyd[failure.circuit].pumpOn = false;
      break;
    case 'HYD_PTU_FAULT':
      // PTU faulted: disarm so derivation will never command it to run.
      state.hyd.ptu.armed = false;
      break;
    case 'ENG_FIRE':
      state.engines[failure.engine - 1].running = false;
      break;
    // HYD_LEAK and RAPID_DEPRESS carry rates consumed by the integrator;
    // nothing discrete to set at injection time.
    case 'HYD_LEAK':
    case 'RAPID_DEPRESS':
      break;
  }
}

/** Identity for de-duping injected failures (kind + the field that targets it). */
function sameFailure(a: ActiveFailure, b: ActiveFailure): boolean {
  if (a.kind !== b.kind) return false;
  if ('circuit' in a && 'circuit' in b) return a.circuit === b.circuit;
  if (a.kind === 'ENG_FIRE' && b.kind === 'ENG_FIRE') return a.engine === b.engine;
  return true;
}

/** Convenience constructors so callers don't hand-build event objects. */
export const crewAction = (t: number, action: CrewAction): SimEvent => ({
  t,
  kind: 'CREW_ACTION',
  action,
});

export const failureInject = (t: number, failure: ActiveFailure): SimEvent => ({
  t,
  kind: 'FAILURE_INJECT',
  failure,
});
