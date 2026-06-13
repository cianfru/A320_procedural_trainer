import type { AircraftState, SimEvent } from './types';
import { applyEvent } from './events';
import { integrate } from './integrator';
import { deriveSystems } from './systems';
import { reduceFwc } from './fwc/fwc';

/**
 * One fixed sim step, in the load-bearing order from spec §2.1:
 *
 *   1. Apply queued events  (crew + failures → conditions/rates/targets)
 *   2. Integrate            (advance continuous quantities by dt)
 *   3. Systems derivation   (pure → pressures + auto-reconfig)
 *   4. FWC reduce           (stateful → annunciation slice)
 *   5. Displays read        (not here — that's the render layer)
 *
 * `pendingEvents` are the events whose time has come this tick. They are
 * appended to the event log (spec §2.3 determinism) before being applied, so
 * the log remains the replayable record of the scenario.
 *
 * Mutates `state` in place and returns it (the store relies on a fresh draft
 * being passed in so React sees a new reference).
 */
export function tick(
  state: AircraftState,
  dt: number,
  pendingEvents: SimEvent[] = [],
): AircraftState {
  // 1. Apply queued events.
  for (const ev of pendingEvents) {
    state.eventLog.push(ev);
    applyEvent(state, ev);
  }

  // 2. Integrate.
  integrate(state, dt);

  // 3. Systems derivation (pure).
  deriveSystems(state);

  // 4. FWC reduce (stateful).
  state.fwc = reduceFwc(state.fwc, state, dt);

  // Advance the clock.
  state.clock.t += dt;

  return state;
}
