import type { AircraftState, HydSys } from '../types';
import { HYD } from '../constants';

/**
 * Hydraulics derivation — the GREEN-failure pattern, generalised (spec §3, §4
 * Stage 1). Pure and stateless: `state → pressures + auto-reconfig`.
 *
 * Pressure is DERIVED, never authored. A system builds nominal pressure iff a
 * pump is commanded on, its reservoir is above the usable minimum, and (for an
 * engine-driven pump) the driving engine is running.
 */

export interface HydDerivation {
  greenPsi: number;
  bluePsi: number;
  yellowPsi: number;
  /** PTU should run (auto-reconfiguration flag). */
  ptuRunning: boolean;
}

/** Map each system to the engine that drives its pump (0-based, or null). */
const PUMP_DRIVE_ENGINE: Record<'green' | 'blue' | 'yellow', number | null> = {
  green: 0, // ENG 1
  yellow: 1, // ENG 2
  blue: null, // electric pump — engine-independent
};

function pressureFor(
  sys: HydSys,
  driveEngineRunning: boolean,
): number {
  const canSupply =
    sys.pumpOn &&
    sys.reservoirFrac > HYD.RESERVOIR_MIN_FRAC &&
    driveEngineRunning;
  return canSupply ? HYD.NOMINAL_PSI : 0;
}

export function deriveHydraulics(state: AircraftState): HydDerivation {
  const engRunning = (i: number | null) =>
    i === null ? true : (state.engines[i]?.running ?? false);

  const greenPsi = pressureFor(
    state.hyd.green,
    engRunning(PUMP_DRIVE_ENGINE.green),
  );
  const bluePsi = pressureFor(state.hyd.blue, engRunning(PUMP_DRIVE_ENGINE.blue));
  const yellowPsi = pressureFor(
    state.hyd.yellow,
    engRunning(PUMP_DRIVE_ENGINE.yellow),
  );

  // PTU auto-runs when armed and there is a meaningful cross-system pressure
  // difference (one side low while the other can supply). Simplified bi-directional.
  const lo = HYD.LO_PR_PSI;
  const greenLow = greenPsi < lo;
  const yellowLow = yellowPsi < lo;
  const ptuRunning =
    state.hyd.ptu.armed &&
    ((greenLow && yellowPsi >= lo) || (yellowLow && greenPsi >= lo));

  return { greenPsi, bluePsi, yellowPsi, ptuRunning };
}
