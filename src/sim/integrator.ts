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
  for (const f of state.failures) {
    if (f.kind !== 'HYD_LEAK') continue;
    const drainPerSec = f.reservoirDrainFracPerMin / 60;
    const sys = state.hyd[f.circuit];
    sys.reservoirFrac = clamp01(sys.reservoirFrac - drainPerSec * dt);
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
  const p = state.press;
  const acAlt = state.kinematics.altFt;
  const depress = state.failures.find((f) => f.kind === 'RAPID_DEPRESS');
  const packsLost = !p.pack1 && !p.pack2;

  const prevCabin = p.cabinAltFt;
  let target: number;
  let rateFpm: number;

  if (depress && depress.kind === 'RAPID_DEPRESS') {
    // Depressurised: cabin chases ambient (aircraft) altitude — up while high,
    // and back DOWN as the crew descends. This is the dynamic that makes the
    // emergency-descent scenario work end to end.
    target = acAlt;
    rateFpm = depress.cabinClimbFpm;
  } else if (packsLost) {
    // No pressurisation source: cabin drifts toward ambient, slowly.
    target = acAlt;
    rateFpm = 500;
  } else {
    // Normal control: hold a scheduled cabin altitude (≤ 8050 ft, FBW max).
    target = Math.max(0, Math.min(8050, acAlt * (8000 / 39000)));
    rateFpm = 500;
  }

  const maxStep = (rateFpm / 60) * dt;
  const delta = target - p.cabinAltFt;
  p.cabinAltFt += Math.sign(delta) * Math.min(Math.abs(delta), maxStep);
  p.cabinVsFpm = ((p.cabinAltFt - prevCabin) / dt) * 60;

  // Differential pressure from the cabin/ambient altitudes (ISA approximation).
  p.diffPsi = isaPressurePsi(p.cabinAltFt) - isaPressurePsi(acAlt);
}

/** Crude ISA static pressure (psi) vs altitude (ft) — good enough for ΔP display. */
function isaPressurePsi(altFt: number): number {
  return 14.696 * Math.pow(1 - 6.8756e-6 * altFt, 5.2559);
}

function integrateKinematics(state: AircraftState, dt: number): void {
  state.kinematics.altFt += (state.kinematics.vsFpm / 60) * dt;
  // Emergency-descent level-off: arrest the descent at FL100 (10,000 ft).
  if (state.kinematics.vsFpm < 0 && state.kinematics.altFt <= 10000) {
    state.kinematics.altFt = 10000;
    state.kinematics.vsFpm = 0;
  }
}

function integrateOxygen(state: AircraftState, dt: number): void {
  if (state.config.masks) {
    state.o2.crewMin = Math.max(0, state.o2.crewMin - dt / 60);
  }
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}
