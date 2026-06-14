import type { FailureCatalogEntry } from './types';

/**
 * THE failure catalog. Add every A320 ECAM failure here. Implement in roadmap
 * system order (HYD → ELEC → BLEED/AIR → FUEL → F/CTL → …, decision #4),
 * flipping `status` as each one is fully wired through the pipeline.
 *
 * Wording/thresholds tagged for validation live with the code (`// VALIDATE`)
 * or in the `validate` field here. References are clean-room oracles
 * (FCOM/QRH/FBW), never code to be copied.
 */
export const FAILURE_CATALOG: FailureCatalogEntry[] = [
  // ── ATA 29 — HYDRAULICS (the proven, fully-implemented chapter) ─────────
  {
    id: 'HYD_G_ENG1_PUMP_LO_PR',
    ata: '29',
    system: 'HYD',
    title: 'HYD: GREEN ENG 1 PUMP LO PR',
    status: 'implemented',
    raises: ['HYD_G_SYS_LO_PR'],
    refs: { fcom: 'FCOM 1.29', fbw: 'A32NX hydraulics' },
    build: () => ({ kind: 'HYD_PUMP_LOPR', circuit: 'green' }),
  },
  {
    id: 'HYD_Y_ENG2_PUMP_LO_PR',
    ata: '29',
    system: 'HYD',
    title: 'HYD: YELLOW ENG 2 PUMP LO PR',
    status: 'implemented',
    raises: ['HYD_Y_SYS_LO_PR'],
    build: () => ({ kind: 'HYD_PUMP_LOPR', circuit: 'yellow' }),
  },
  {
    id: 'HYD_B_ELEC_PUMP_LO_PR',
    ata: '29',
    system: 'HYD',
    title: 'HYD: BLUE ELEC PUMP LO PR',
    status: 'implemented',
    raises: ['HYD_B_SYS_LO_PR'],
    build: () => ({ kind: 'HYD_PUMP_LOPR', circuit: 'blue' }),
  },
  {
    id: 'HYD_G_RSVR_LEAK',
    ata: '29',
    system: 'HYD',
    title: 'HYD: GREEN RSVR LEAK',
    status: 'implemented',
    raises: ['HYD_G_SYS_LO_PR'],
    validate: 'Drain rate placeholder; confirm realistic leak rates.',
    build: (p) => ({
      kind: 'HYD_LEAK',
      circuit: 'green',
      reservoirDrainFracPerMin: p?.rate ?? 0.25,
    }),
  },
  {
    id: 'HYD_Y_RSVR_LEAK',
    ata: '29',
    system: 'HYD',
    title: 'HYD: YELLOW RSVR LEAK',
    status: 'implemented',
    raises: ['HYD_Y_SYS_LO_PR'],
    build: (p) => ({
      kind: 'HYD_LEAK',
      circuit: 'yellow',
      reservoirDrainFracPerMin: p?.rate ?? 0.25,
    }),
  },
  {
    id: 'HYD_PTU_FAULT',
    ata: '29',
    system: 'HYD',
    title: 'HYD: PTU FAULT',
    status: 'implemented',
    raises: ['HYD_PTU_FAULT'],
    build: () => ({ kind: 'HYD_PTU_FAULT' }),
  },

  // ── ATA 21 — AIR / PRESSURISATION (the dynamic family — Stage 3) ────────
  {
    id: 'PRESS_RAPID_DEPRESS',
    ata: '21',
    system: 'PRESS',
    title: 'PRESS: RAPID DEPRESSURISATION',
    status: 'implemented',
    raises: ['EXCESS_CAB_ALT'],
    refs: { qrh: 'QRH EMER DESCENT', fbw: 'EXCESSIVE_ALT_WARNING=9550' },
    build: (p) => ({ kind: 'RAPID_DEPRESS', cabinClimbFpm: p?.rate ?? 6000 }),
  },
  {
    id: 'AIR_PACK_1_FAULT',
    ata: '21',
    system: 'AIR',
    title: 'AIR: PACK 1 FAULT',
    status: 'implemented',
    raises: ['AIR_PACK_1_FAULT'],
    build: () => ({ kind: 'AIR_PACK_FAULT', pack: 1 }),
  },
  {
    id: 'AIR_PACK_2_FAULT',
    ata: '21',
    system: 'AIR',
    title: 'AIR: PACK 2 FAULT',
    status: 'implemented',
    raises: ['AIR_PACK_2_FAULT'],
    build: () => ({ kind: 'AIR_PACK_FAULT', pack: 2 }),
  },
  {
    id: 'CAB_PR_SYS_1_FAULT',
    ata: '21',
    system: 'PRESS',
    title: 'PRESS: CAB PR SYS 1 FAULT',
    status: 'partial',
    raises: ['CAB_PR_SYS_1_2_FAULT'],
    validate: 'Single-CPC fault auto-transfers; pair with SYS 2 for SYS 1+2 FAULT.',
    build: () => ({ kind: 'CAB_PR_SYS_FAULT', sys: 1 }),
  },
  {
    id: 'CAB_PR_SYS_2_FAULT',
    ata: '21',
    system: 'PRESS',
    title: 'PRESS: CAB PR SYS 2 FAULT',
    status: 'partial',
    raises: ['CAB_PR_SYS_1_2_FAULT'],
    build: () => ({ kind: 'CAB_PR_SYS_FAULT', sys: 2 }),
  },

  // ── ATA 70-80 — POWERPLANT (partial — Stage 6/7) ────────────────────────
  {
    id: 'ENG_1_FIRE',
    ata: '70',
    system: 'ENG',
    title: 'ENG: ENG 1 FIRE',
    status: 'partial',
    raises: ['ENG1_FIRE'],
    validate: 'Fire-bottle / agent timers and full drill: Stage 6.',
    build: () => ({ kind: 'ENG_FIRE', engine: 1 }),
  },
  {
    id: 'ENG_2_FIRE',
    ata: '70',
    system: 'ENG',
    title: 'ENG: ENG 2 FIRE',
    status: 'partial',
    raises: ['ENG2_FIRE'],
    build: () => ({ kind: 'ENG_FIRE', engine: 2 }),
  },

  // ── ATA 24 — ELECTRICAL (implemented: the bus-loss reconfiguration family) ─
  {
    id: 'ELEC_GEN_1_FAULT',
    ata: '24',
    system: 'ELEC',
    title: 'ELEC: GEN 1 FAULT',
    status: 'implemented',
    raises: ['ELEC_GEN_1_FAULT'],
    refs: { fcom: 'FCOM 1.24', fbw: 'A32NX electrical' },
    build: () => ({ kind: 'ELEC_GEN_FAULT', gen: 1 }),
  },
  {
    id: 'ELEC_GEN_2_FAULT',
    ata: '24',
    system: 'ELEC',
    title: 'ELEC: GEN 2 FAULT',
    status: 'implemented',
    raises: ['ELEC_GEN_2_FAULT'],
    build: () => ({ kind: 'ELEC_GEN_FAULT', gen: 2 }),
  },
  {
    id: 'ELEC_AC_BUS_1_FAULT',
    ata: '24',
    system: 'ELEC',
    title: 'ELEC: AC BUS 1 FAULT',
    status: 'implemented',
    raises: ['ELEC_AC_BUS_1_FAULT'],
    build: () => ({ kind: 'ELEC_AC_BUS_FAULT', bus: 1 }),
  },
  {
    id: 'ELEC_AC_BUS_2_FAULT',
    ata: '24',
    system: 'ELEC',
    title: 'ELEC: AC BUS 2 FAULT',
    status: 'implemented',
    raises: ['ELEC_AC_BUS_2_FAULT'],
    build: () => ({ kind: 'ELEC_AC_BUS_FAULT', bus: 2 }),
  },
  {
    id: 'ELEC_TR_1_FAULT',
    ata: '24',
    system: 'ELEC',
    title: 'ELEC: TR 1 FAULT',
    status: 'implemented',
    raises: ['ELEC_TR_1_FAULT'],
    build: () => ({ kind: 'ELEC_TR_FAULT', tr: 1 }),
  },
  {
    id: 'ELEC_TR_2_FAULT',
    ata: '24',
    system: 'ELEC',
    title: 'ELEC: TR 2 FAULT',
    status: 'implemented',
    raises: ['ELEC_TR_2_FAULT'],
    build: () => ({ kind: 'ELEC_TR_FAULT', tr: 2 }),
  },
  {
    id: 'ELEC_EMER_CONFIG',
    ata: '24',
    system: 'ELEC',
    title: 'ELEC: EMER CONFIG (DUAL GEN)',
    status: 'implemented',
    raises: ['ELEC_EMER_CONFIG'],
    validate: 'RAT deploy also needs sufficient airspeed; not modelled yet.',
    // Trip GEN 2 here; pair with GEN 1 FAULT to enter EMER CONFIG (both AC lost).
    build: () => ({ kind: 'ELEC_GEN_FAULT', gen: 2 }),
  },

  // ── ELEC backlog (planned) ──────────────────────────────────────────────
  planned('ELEC_DC_BUS_1_FAULT', '24', 'ELEC', 'ELEC: DC BUS 1 FAULT', ['ELEC_DC_BUS_1_FAULT']),
  planned('ELEC_BAT_1_FAULT', '24', 'ELEC', 'ELEC: BAT 1 FAULT', ['ELEC_BAT_1_FAULT']),

  // ATA 36 — BLEED AIR
  planned('BLEED_ENG_1_FAULT', '36', 'BLEED', 'BLEED: ENG 1 BLEED FAULT', ['BLEED_ENG_1_FAULT']),
  planned('BLEED_APU_FAULT', '36', 'BLEED', 'BLEED: APU BLEED FAULT', ['BLEED_APU_FAULT']),
  planned('BLEED_HI_TEMP', '36', 'BLEED', 'BLEED: HI TEMP', ['BLEED_HI_TEMP']),

  // ATA 28 — FUEL
  planned('FUEL_L_WING_PUMP_1_LO_PR', '28', 'FUEL', 'FUEL: L WING TK PUMP 1 LO PR', ['FUEL_L_WING_PUMP_1_LO_PR']),
  planned('FUEL_L_R_WING_TK_LO_LVL', '28', 'FUEL', 'FUEL: L+R WING TK LO LVL', ['FUEL_L_R_WING_TK_LO_LVL']),
  planned('FUEL_LEAK', '28', 'FUEL', 'FUEL: FUEL LEAK', ['FUEL_FU_FOB_DISAGREE']),

  // ATA 27 — FLIGHT CONTROLS
  planned('FCTL_ELAC_1_FAULT', '27', 'FCTL', 'F/CTL: ELAC 1 FAULT', ['FCTL_ELAC_1_FAULT']),
  planned('FCTL_SEC_1_FAULT', '27', 'FCTL', 'F/CTL: SEC 1 FAULT', ['FCTL_SEC_1_FAULT']),
  planned('FCTL_FLAP_FAULT', '27', 'FCTL', 'F/CTL: FLAPS FAULT', ['FCTL_FLAP_FAULT']),
  planned('FCTL_SPD_BRK_DISAGREE', '27', 'FCTL', 'F/CTL: SPD BRK DISAGREE', ['FCTL_SPD_BRK_DISAGREE']),

  // ATA 70-80 — POWERPLANT (further)
  planned('ENG_1_FAIL', '70', 'ENG', 'ENG: ENG 1 FAIL', ['ENG_1_FAIL']),
  planned('ENG_1_OIL_LO_PR', '79', 'ENG', 'ENG: ENG 1 OIL LO PR', ['ENG_1_OIL_LO_PR']),
  planned('ENG_1_STALL', '72', 'ENG', 'ENG: ENG 1 STALL', ['ENG_1_STALL']),
  planned('ENG_1_EGT_OVER_LIMIT', '77', 'ENG', 'ENG: ENG 1 EGT OVER LIMIT', ['ENG_1_EGT_OVER_LIMIT']),

  // ATA 49 — APU
  planned('APU_FAULT', '49', 'APU', 'APU: APU FAULT', ['APU_FAULT']),
  planned('APU_FIRE', '49', 'FIRE', 'APU: APU FIRE', ['APU_FIRE']),

  // ATA 34 — NAV / ADIRS
  planned('NAV_ADR_1_FAULT', '34', 'NAV', 'NAV: ADR 1 FAULT', ['NAV_ADR_1_FAULT']),
  planned('NAV_IR_1_FAULT', '34', 'NAV', 'NAV: IR 1 FAULT', ['NAV_IR_1_FAULT']),

  // ATA 32 — LANDING GEAR
  planned('LGEAR_NOT_DOWN', '32', 'LGEAR', 'L/G: GEAR NOT DOWNLOCKED', ['LGEAR_NOT_DOWN']),

  // ATA 22 — AUTOFLIGHT
  planned('AUTOFLT_AP_OFF', '22', 'AUTOFLT', 'AUTO FLT: AP OFF', ['AUTOFLT_AP_OFF']),
  planned('AUTOFLT_A_THR_OFF', '22', 'AUTOFLT', 'AUTO FLT: A/THR OFF', ['AUTOFLT_A_THR_OFF']),
];

/** Terse constructor for backlog entries (no builder, no code yet). */
function planned(
  id: string,
  ata: string,
  system: FailureCatalogEntry['system'],
  title: string,
  raises: string[],
): FailureCatalogEntry {
  return { id, ata, system, title, status: 'planned', raises };
}

/** Lookup by catalog id. */
export const FAILURE_BY_ID: Record<string, FailureCatalogEntry> =
  Object.fromEntries(FAILURE_CATALOG.map((e) => [e.id, e]));

/** Runnable entries (have a builder) — what the injection menu can offer. */
export const RUNNABLE_FAILURES = FAILURE_CATALOG.filter((e) => e.build);
