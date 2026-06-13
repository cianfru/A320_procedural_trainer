import type { AircraftState, CrewAction, ActiveFailure, SimEvent } from './types';

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
  }
}

function applyFailure(state: AircraftState, failure: ActiveFailure): void {
  // Avoid stacking duplicate failures of the same kind.
  if (!state.failures.some((f) => f.kind === failure.kind)) {
    state.failures.push(failure);
  }

  switch (failure.kind) {
    case 'G_ENG1_PUMP_LOPR':
      // Engine-1-driven GREEN pump loses pressure: model as pump off.
      state.hyd.green.pumpOn = false;
      break;
    case 'ENG_FIRE':
      state.engines[failure.engine - 1].running = false;
      break;
    // G_HYD_LEAK and RAPID_DEPRESS carry rates consumed by the integrator;
    // nothing discrete to set at injection time.
    case 'G_HYD_LEAK':
    case 'RAPID_DEPRESS':
      break;
  }
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
