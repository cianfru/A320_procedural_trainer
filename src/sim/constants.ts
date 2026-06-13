/**
 * Numeric thresholds. Anything not yet cross-checked against FCOM/QRH/OM-B is
 * tagged `// VALIDATE` with a source field, per spec §6. Do not bury magic
 * numbers in logic — surface them here so the validation backlog is visible.
 */

export const HYD = {
  /** Nominal system pressure when a pump is supplying. */
  NOMINAL_PSI: 3000,
  /**
   * GREEN "LO PR" caution threshold.
   * VALIDATE: placeholder 1450 psi. Source: TBD (FCOM 1.29 HYD).
   */
  LO_PR_PSI: 1450, // VALIDATE
  /** Reservoir fraction below which the pump can no longer build pressure. */
  RESERVOIR_MIN_FRAC: 0.05, // VALIDATE
};

export const FWC = {
  /**
   * Generic caution confirmation/debounce before annunciation.
   * VALIDATE: representative value; real values are per-condition.
   */
  DEFAULT_CONFIRM_S: 0.3, // VALIDATE
};

export const PRESS = {
  /**
   * EXCESS CAB ALT trigger.
   * VALIDATE: ~9,550 ft — confirm. Source: TBD (FCOM 1.21 PRESS).
   */
  EXCESS_CAB_ALT_FT: 9550, // VALIDATE
  /**
   * Pax mask auto-deploy altitude.
   * VALIDATE: ~14,000 ft — confirm.
   */
  PAX_MASK_DEPLOY_FT: 14000, // VALIDATE
};
