/**
 * Core state shape for the A320 procedural trainer.
 *
 * This file is pure types — no logic, no framework. It is the contract that
 * the integrator, systems derivation, FWC reducer and displays all read from.
 *
 * Reference config (spec §5): FBW A32NX — A320-251N / LEAP-1A / FWC H2F13.
 *
 * Many numeric thresholds here are still unvalidated; those live in
 * `src/sim/constants.ts` tagged with `// VALIDATE` per spec §6.
 */

export const TICK_HZ = 10 as const;

export type FlightPhase =
  | 'PREFLIGHT'
  | 'TAKEOFF'
  | 'CLIMB'
  | 'CRUISE'
  | 'DESCENT'
  | 'APPROACH'
  | 'GO_AROUND'
  | 'DONE';

// ─────────────────────────────────────────────────────────────────────────
// Hydraulics (Stage 1 — the proven static family)
// ─────────────────────────────────────────────────────────────────────────

/** A single hydraulic system: GREEN, BLUE or YELLOW. */
export interface HydSys {
  /** Engine-/electric-driven pump commanded ON. */
  pumpOn: boolean;
  /** Reservoir quantity, 0..1 (fraction of usable). */
  reservoirFrac: number;
  /**
   * System pressure, psi. DERIVED each tick by systems derivation — never
   * authored by a failure, never written by the integrator. Stored on state
   * only so displays and the FWC can read a single source of truth.
   */
  pressurePsi: number;
}

export type PtuState = {
  /** Auto-reconfiguration flag — owned by systems derivation only. */
  running: boolean;
  /** PTU armed (PTU pushbutton AUTO). */
  armed: boolean;
};

export interface HydraulicsState {
  green: HydSys;
  blue: HydSys;
  yellow: HydSys;
  ptu: PtuState;
}

// ─────────────────────────────────────────────────────────────────────────
// Kinematics / pressurisation / engines (mostly Stage 3+, sketched now)
// ─────────────────────────────────────────────────────────────────────────

export interface Kinematics {
  altFt: number;
  vsFpm: number;
  ias: number;
  mach: number;
  hdg: number;
  lat: number;
  lon: number;
  pitch: number;
  bank: number;
}

// ─────────────────────────────────────────────────────────────────────────
// Electrical (ATA 24) — Stage 6. Conditions on the SOURCES; bus powering and
// reconfiguration (bus tie, RAT/emer config) are DERIVED, never authored.
// ─────────────────────────────────────────────────────────────────────────

export interface GenState {
  /** Generator pushbutton ON (i.e. not manually selected off). */
  on: boolean;
  /** Generator faulted (tripped offline). */
  fault: boolean;
}

export interface ElecState {
  // Sources (conditions, owned by event apply)
  gen1: GenState;
  gen2: GenState;
  apuGen: { on: boolean; available: boolean };
  extPwr: { on: boolean; available: boolean };
  bat1: { on: boolean };
  bat2: { on: boolean };

  // Derived network state (owned by systems derivation only)
  acBus1: boolean;
  acBus2: boolean;
  acEss: boolean;
  tr1: boolean;
  tr2: boolean;
  dcBus1: boolean;
  dcBus2: boolean;
  dcBat: boolean;
  dcEss: boolean;
  busTie: boolean; // cross-feed contactor closed (auto-reconfig)
  ratDeployed: boolean; // RAT out (auto-reconfig)
  emerConfig: boolean; // electrical emergency configuration
}

export interface PressState {
  cabinAltFt: number;
  cabinVsFpm: number;
  diffPsi: number;
  outflow: number;
  packFlow: 'LO' | 'NORM' | 'HI';
  // Conditions (event-owned): pack/CPC selected on; faults live in failures[].
  pack1On: boolean;
  pack2On: boolean;
  // Derived (air derivation owns): operative state + pax-mask auto-deploy.
  pack1: boolean;
  pack2: boolean;
  paxMasksDeployed: boolean;
}

export interface EngineState {
  n1: number;
  n2: number;
  egt: number;
  ff: number;
  /** Thrust lever angle. */
  tla: number;
  /** Commanded N1 — the spool target the integrator chases. */
  n1Cmd: number;
  running: boolean;
}

export interface ConfigState {
  gear: 'UP' | 'DOWN' | 'TRANSIT';
  flaps: number;
  slats: number;
  speedbrake: number;
  /** Crew oxygen masks in use (consumes crew O2). */
  masks: boolean;
  /** Engine ignition selector continuous (ENG MODE SEL → IGN). */
  engModeIgn: boolean;
  signs: { seatbelts: boolean; noSmoking: boolean };
}

// ── FCU — Flight Control Unit (glareshield) ──────────────────────────────
// Selected targets + mode buttons. Displayed and settable now; the autoflight
// logic that makes them actually fly the aircraft is Stage 7 (drawn-then-
// stubbed posture, spec §4). A "managed" channel shows a dot instead of a value.

export interface FcuState {
  spd: number; // selected SPD (kt) — or MACH×100 when spdMode==='MACH'
  spdMode: 'SPD' | 'MACH';
  spdManaged: boolean;
  hdg: number; // selected HDG/TRK (deg)
  hdgMode: 'HDG' | 'TRK';
  hdgManaged: boolean;
  alt: number; // selected ALT (ft)
  altManaged: boolean;
  vs: number; // selected V/S (fpm); 0 + !vsActive ⇒ dashes
  vsActive: boolean;
  ap1: boolean;
  ap2: boolean;
  athr: boolean;
  loc: boolean;
  appr: boolean;
  exped: boolean;
}

export type FcuField = 'spd' | 'hdg' | 'alt' | 'vs';
export type FcuButton = 'ap1' | 'ap2' | 'athr' | 'loc' | 'appr' | 'exped';

// ─────────────────────────────────────────────────────────────────────────
// Failures — discrete bad-condition mutators that carry RATES, not effects
// ─────────────────────────────────────────────────────────────────────────

export type HydCircuit = 'green' | 'blue' | 'yellow';

export type ActiveFailure =
  // ATA 29 — Hydraulics
  | { kind: 'HYD_LEAK'; circuit: HydCircuit; reservoirDrainFracPerMin: number }
  | { kind: 'HYD_PUMP_LOPR'; circuit: HydCircuit }
  | { kind: 'HYD_PTU_FAULT' }
  // ATA 24 — Electrical
  | { kind: 'ELEC_GEN_FAULT'; gen: 1 | 2 }
  | { kind: 'ELEC_AC_BUS_FAULT'; bus: 1 | 2 }
  | { kind: 'ELEC_TR_FAULT'; tr: 1 | 2 }
  // ATA 21 — Air / Pressurisation
  | { kind: 'RAPID_DEPRESS'; cabinClimbFpm: number }
  | { kind: 'AIR_PACK_FAULT'; pack: 1 | 2 }
  | { kind: 'CAB_PR_SYS_FAULT'; sys: 1 | 2 }
  // ATA 70 — Powerplant
  | { kind: 'ENG_FIRE'; engine: 1 | 2 };

export type FailureKind = ActiveFailure['kind'];

// ─────────────────────────────────────────────────────────────────────────
// Crew actions — the discrete-input vocabulary (shared by event log + scoring)
// ─────────────────────────────────────────────────────────────────────────

export type CrewAction =
  | { kind: 'HYD_PUMP'; sys: HydCircuit; on: boolean }
  | { kind: 'PTU_ARM'; armed: boolean }
  | { kind: 'ELEC_GEN'; gen: 1 | 2; on: boolean }
  | { kind: 'ELEC_APU_GEN'; on: boolean }
  | { kind: 'ECAM_CLR' }
  | { kind: 'ECAM_RECALL' }
  /** Acknowledge/overfly the next MANUAL action line of the top ECAM procedure. */
  | { kind: 'ECAM_ACK_LINE' }
  | { kind: 'MASTER_WARN_ACK' }
  | { kind: 'MASTER_CAUT_ACK' }
  // Emergency-descent / pressurisation crew vocabulary
  | { kind: 'SET_VS'; fpm: number } // commanded vertical speed (descent)
  | { kind: 'THR_IDLE' }
  | { kind: 'SPEEDBRAKE'; value: number } // 0..1
  | { kind: 'ENG_MODE_IGN'; on: boolean }
  | { kind: 'CREW_OXY'; on: boolean }
  | { kind: 'SIGNS_ON' }
  | { kind: 'AIR_PACK'; pack: 1 | 2; on: boolean }
  // FCU (glareshield)
  | { kind: 'FCU_SET'; field: FcuField; delta: number }
  | { kind: 'FCU_PUSH'; field: FcuField } // → managed (or V/S off)
  | { kind: 'FCU_PULL'; field: FcuField } // → selected (or V/S on)
  | { kind: 'FCU_MODE'; field: 'spd' | 'hdg' } // SPD↔MACH, HDG↔TRK
  | { kind: 'FCU_BUTTON'; button: FcuButton };

// ─────────────────────────────────────────────────────────────────────────
// Event log — ordered, timestamped, replayable (spec §2.3)
// ─────────────────────────────────────────────────────────────────────────

export type SimEvent =
  | { t: number; kind: 'CREW_ACTION'; action: CrewAction }
  | { t: number; kind: 'FAILURE_INJECT'; failure: ActiveFailure };

// ─────────────────────────────────────────────────────────────────────────
// FWC — the stateful annunciation reducer (spec §2 invariant #2)
// ─────────────────────────────────────────────────────────────────────────

export type EcamColor = 'WARNING' | 'CAUTION' | 'ADVISORY';
export type AuralId = 'CRC' | 'SC' | 'CAVALRY_CHARGE';
export type SdPageId =
  | 'NONE'
  | 'ENG'
  | 'HYD'
  | 'ELEC'
  | 'BLEED'
  | 'PRESS'
  | 'FUEL'
  | 'FCTL'
  | 'CRUISE'
  | 'STATUS';

/** A single annunciated line, identified semantically (never by display text). */
export interface EcamItem {
  /** Stable semantic id — what regression tests assert on (spec §6). */
  id: string;
  color: EcamColor;
  /** Display title (fidelity-tunable without breaking tests). */
  title: string;
  /** Associated SD page to auto-call, if any. */
  sdPage?: SdPageId;
}

export interface FlightPhaseInhibit {
  itemId: string;
  phases: FlightPhase[];
}

// ── ECAM ACTIONS — the procedure (checklist) layer ───────────────────────
// Each annunciated item may carry a procedure: an ordered list of action
// lines the crew works through. A SENSED line clears automatically when the
// aircraft state satisfies its condition (the crew did the action → state
// changed → line clears). A MANUAL line is overflown by the crew (ECAM_ACK_LINE).
// This keeps invariant #2 intact: completion is DERIVED from state, not authored.

export type EcamActionType = 'SENSED' | 'MANUAL';

export interface EcamActionLine {
  id: string;
  text: string;
  type: EcamActionType;
  /**
   * SENSED lines only: completion predicate over aircraft state. The line
   * clears when this returns true (i.e. the demanded system state is reached).
   */
  done?: (s: AircraftState) => boolean;
}

export interface EcamProcedure {
  itemId: string;
  lines: EcamActionLine[];
}

/** Live progress for one in-work procedure (owned by the FWC slice). */
export interface ProcedureProgress {
  completedLineIds: string[];
  complete: boolean;
}

export interface FwcState {
  active: EcamItem[];
  cleared: EcamItem[];
  /** Debounce timers (seconds remaining) before an item annunciates. */
  confirmTimers: Record<string, number>;
  /** Single-shot aurals queued for the aural layer to drain. */
  auralsPending: AuralId[];
  masterWarn: boolean;
  masterCaut: boolean;
  sdPage: SdPageId;
  inhibits: FlightPhaseInhibit[];
  /** ECAM ACTIONS progress, keyed by EcamItem.id. */
  procedures: Record<string, ProcedureProgress>;
}

// ─────────────────────────────────────────────────────────────────────────
// The single source of truth
// ─────────────────────────────────────────────────────────────────────────

export interface AircraftState {
  clock: { t: number; phase: FlightPhase; tickHz: typeof TICK_HZ };
  kinematics: Kinematics;
  press: PressState;
  engines: EngineState[];
  hyd: HydraulicsState;
  elec: ElecState;
  config: ConfigState;
  fcu: FcuState;
  o2: { crewMin: number; paxMin: number };

  failures: ActiveFailure[];
  fwc: FwcState;
  eventLog: SimEvent[];
}
