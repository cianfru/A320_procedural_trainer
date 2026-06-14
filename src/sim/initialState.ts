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
      pack1On: true,
      pack2On: true,
      pack1: true,
      pack2: true,
      paxMasksDeployed: false,
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
    elec: {
      gen1: { on: true, fault: false },
      gen2: { on: true, fault: false },
      apuGen: { on: false, available: false },
      extPwr: { on: false, available: false },
      bat1: { on: true },
      bat2: { on: true },
      // derived on the first tick
      acBus1: false,
      acBus2: false,
      acEss: false,
      tr1: false,
      tr2: false,
      dcBus1: false,
      dcBus2: false,
      dcBat: false,
      dcEss: false,
      busTie: false,
      ratDeployed: false,
      emerConfig: false,
    },
    config: {
      gear: 'UP',
      flaps: 0,
      slats: 0,
      speedbrake: 0,
      masks: false,
      engModeIgn: false,
      signs: { seatbelts: true, noSmoking: true },
    },
    fcu: {
      spd: 280,
      spdMode: 'SPD',
      spdManaged: true,
      hdg: 0,
      hdgMode: 'HDG',
      hdgManaged: true,
      alt: 37000,
      altManaged: true,
      vs: 0,
      vsActive: false,
      ap1: true,
      ap2: false,
      athr: true,
      loc: false,
      appr: false,
      exped: false,
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
