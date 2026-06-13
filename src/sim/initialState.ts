import type { AircraftState } from './types';
import { TICK_HZ } from './types';

/**
 * A fresh, steady-state aircraft. Static scenarios sit here with the clock
 * running (invariant #1: tick-based from day one, even at steady state).
 *
 * Defaults are a clean cruise-ish config with all systems healthy, so that
 * injecting a single failure produces an isolated, observable consequence.
 */
export function createInitialState(): AircraftState {
  const healthyHyd = () => ({
    pumpOn: true,
    reservoirFrac: 1,
    pressurePsi: 0, // derived on the first tick
  });

  return {
    clock: { t: 0, phase: 'CRUISE', tickHz: TICK_HZ },
    kinematics: {
      altFt: 37000,
      vsFpm: 0,
      ias: 280,
      mach: 0.78,
      hdg: 0,
      lat: 0,
      lon: 0,
      pitch: 2.5,
      bank: 0,
    },
    press: {
      cabinAltFt: 6500,
      cabinVsFpm: 0,
      diffPsi: 7.8,
      outflow: 0.5,
      packFlow: 'NORM',
    },
    engines: [
      { n1: 85, n2: 92, egt: 600, ff: 1100, tla: 25, n1Cmd: 85, running: true },
      { n1: 85, n2: 92, egt: 600, ff: 1100, tla: 25, n1Cmd: 85, running: true },
    ],
    hyd: {
      green: healthyHyd(),
      blue: healthyHyd(),
      yellow: healthyHyd(),
      ptu: { armed: true, running: false },
    },
    config: {
      gear: 'UP',
      flaps: 0,
      slats: 0,
      speedbrake: 0,
      masks: false,
      signs: { seatbelts: true, noSmoking: true },
    },
    o2: { crewMin: 120, paxMin: 22 },

    failures: [],
    fwc: {
      active: [],
      cleared: [],
      confirmTimers: {},
      auralsPending: [],
      masterWarn: false,
      masterCaut: false,
      sdPage: 'CRUISE',
      inhibits: [],
      procedures: {},
    },
    eventLog: [],
  };
}
