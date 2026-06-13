import type { AircraftState } from '../types';
import { deriveHydraulics } from './hydraulics';

/**
 * Systems derivation — tick step 3 (spec §2.1).
 *
 * Pure, stateless: `state → consumer availabilities + auto-reconfiguration`.
 * Per the write-ownership contract (§2.2) this step writes back ONLY derived
 * pressures and auto-reconfig flags (PTU/RAT/bus transfer). It must never touch
 * continuous quantities (integrator owns those) or the FWC slice.
 *
 * As more systems land (ELEC → BLEED/AIR → FUEL → F/CTL, decision #4) each gets
 * its own `derive*` module and is composed here.
 */
export function deriveSystems(state: AircraftState): void {
  const hyd = deriveHydraulics(state);

  state.hyd.green.pressurePsi = hyd.greenPsi;
  state.hyd.blue.pressurePsi = hyd.bluePsi;
  state.hyd.yellow.pressurePsi = hyd.yellowPsi;
  state.hyd.ptu.running = hyd.ptuRunning;
}

export { deriveHydraulics } from './hydraulics';
export type { HydDerivation } from './hydraulics';
