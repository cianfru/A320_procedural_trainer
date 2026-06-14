/**
 * Numeric thresholds. Values are now cross-checked against the FlyByWire A32NX
 * source + FCOM — see docs/research/A320_SYSTEMS_REFERENCE.md for citations.
 * Anything still unconfirmed keeps a `// VALIDATE` tag (spec §6).
 */

export const HYD = {
  /** Nominal system pressure when a pump is supplying. [FBW: HYDRAULIC_TARGET_PRESSURE_PSI] */
  NOMINAL_PSI: 3000,
  /** "LO PR" caution threshold. [FBW: MIN_PRESS_PRESSURISED_LO_HYST = 1450] */
  LO_PR_PSI: 1450,
  /** Reservoir fraction below which the pump can no longer build pressure. */
  RESERVOIR_MIN_FRAC: 0.05, // VALIDATE (cavitation point — approximate)
  /**
   * RSVR LO LVL caution thresholds, as a fraction of usable volume.
   * [FBW low-level switches: GREEN 3/18 L, BLUE 2/8 L, YELLOW 3/18 L]
   */
  RSVR_LO_LVL_FRAC: { green: 3 / 18, blue: 2 / 8, yellow: 3 / 18 },
} as const;

export const FWC = {
  /**
   * Generic caution confirmation/debounce before annunciation.
   * VALIDATE: representative value; real values are per-condition.
   */
  DEFAULT_CONFIRM_S: 0.3, // VALIDATE
  /** ENG/APU fire-agent discharge timers. [FBW PseudoFWC NXLogicClockNode] */
  FIRE_AGENT_1_DELAY_S: 10,
  FIRE_AGENT_2_DELAY_S: 30,
} as const;

export const PRESS = {
  /** EXCESS CAB ALT red warning. [FBW: EXCESSIVE_ALT_WARNING = 9550 ft] */
  EXCESS_CAB_ALT_FT: 9550,
  /** Cabin-alt display pulse threshold (amber-pulse band start). [FBW SD PRESS] */
  CAB_ALT_PULSE_FT: 8800,
  /** Pax mask auto-deploy altitude (16,000 ft if HI ALT LDG selected). [FCOM] */
  PAX_MASK_DEPLOY_FT: 14000,
  /** LO DIFF PR caution. [FBW: LOW_DIFFERENTIAL_PRESSURE_WARNING = 1.45 psi] */
  LO_DIFF_PR_PSI: 1.45,
  /** Max normal differential pressure (climb target). [FBW: MAX_CLIMB_DELTA_P; FCOM cites ~8.6] */
  MAX_DELTA_P_PSI: 8.06,
} as const;

/** Engine limits — LEAP-1A26 (NOT CFM56). [FBW EWD + FCOM] */
export const ENG = {
  EGT_TO_MAX_C: 1060, // takeoff / go-around redline
  EGT_MCT_MAX_C: 1025, // max continuous
  EGT_START_GROUND_C: 750,
  EGT_START_FLIGHT_C: 875,
  N1_MAX_PCT: 101,
  N2_MAX_PCT: 116.5,
  OIL_PRESS_RED_PSI: 12,
  OIL_PRESS_LO_PSI: 14,
  OIL_TEMP_MAX_C: 155,
} as const;
