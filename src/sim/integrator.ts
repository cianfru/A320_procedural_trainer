import type { AircraftState } from './types';

/**
 * Integrator — tick step 2 (spec §2.1).
 *
 * Advances every time-evolving continuous quantity by `dt` seconds. The ONLY
 * writer of continuous quantities (write-ownership contract, §2.2). Pure
 * arithmetic: crew actions change rates/targets elsewhere, never values here.
 *
 * Mutates `state` in place.
 */
export function integrate(state: AircraftState, dt: number): void {
  integrateHydraulics(state, dt);
  integrateEngines(state, dt);
  integratePressurisation(state, dt);
  integrateKinematics(state, dt);
  integrateOxygen(state, dt);
}

function integrateHydraulics(state: AircraftState, dt: number): void {
  const leak = state.failures.find((f) => f.kind === 'G_HYD_LEAK');
  if (leak && leak.kind === 'G_HYD_LEAK') {
    const drainPerSec = leak.reservoirDrainFracPerMin / 60;
    state.hyd.green.reservoirFrac = clamp01(
      state.hyd.green.reservoirFrac - drainPerSec * dt,
    );
  }
}

function integrateEngines(state: AircraftState, dt: number): void {
  // First-order spool lag toward commanded N1 (spec §2 item 3).
  const TAU = 3.0; // s — spool time constant. VALIDATE.
  const k = 1 - Math.exp(-dt / TAU);
  for (const eng of state.engines) {
    const target = eng.running ? eng.n1Cmd : 0;
    eng.n1 += (target - eng.n1) * k;
    eng.n2 += ((eng.running ? eng.n1Cmd + 7 : 0) - eng.n2) * k;
  }
}

function integratePressurisation(state: AircraftState, dt: number): void {
  const depress = state.failures.find((f) => f.kind === 'RAPID_DEPRESS');
  if (depress && depress.kind === 'RAPID_DEPRESS') {
    state.press.cabinVsFpm = depress.cabinClimbFpm;
  }
  state.press.cabinAltFt += (state.press.cabinVsFpm / 60) * dt;
}

function integrateKinematics(state: AircraftState, dt: number): void {
  state.kinematics.altFt += (state.kinematics.vsFpm / 60) * dt;
}

function integrateOxygen(state: AircraftState, dt: number): void {
  if (state.config.masks) {
    state.o2.crewMin = Math.max(0, state.o2.crewMin - dt / 60);
  }
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}
