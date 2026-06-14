import type { AircraftState, EcamItem } from '../types';
import { HYD, PRESS } from '../constants';

/**
 * FWC condition table.
 *
 * Each entry is a pure predicate over aircraft state that returns the ECAM item
 * when the condition is present. The FWC reducer (the stateful part) layers
 * confirmation timers, latching, the clear/recall stack and aurals on top.
 *
 * This is the heart of invariant #2: the FWC reasons FROM state, it is never
 * handed an authored "show X". Adding a caution = adding a predicate here.
 */

export interface FwcCondition {
  item: EcamItem;
  /** Present this tick? (raw, pre-debounce, pre-latch). */
  present: (s: AircraftState) => boolean;
}

export const CONDITIONS: FwcCondition[] = [
  {
    item: {
      id: 'HYD_G_SYS_LO_PR',
      color: 'CAUTION',
      title: 'HYD G SYS LO PR',
      sdPage: 'HYD',
    },
    present: (s) => s.hyd.green.pressurePsi < HYD.LO_PR_PSI,
  },
  {
    item: {
      id: 'HYD_B_SYS_LO_PR',
      color: 'CAUTION',
      title: 'HYD B SYS LO PR',
      sdPage: 'HYD',
    },
    present: (s) => s.hyd.blue.pressurePsi < HYD.LO_PR_PSI,
  },
  {
    item: {
      id: 'HYD_Y_SYS_LO_PR',
      color: 'CAUTION',
      title: 'HYD Y SYS LO PR',
      sdPage: 'HYD',
    },
    present: (s) => s.hyd.yellow.pressurePsi < HYD.LO_PR_PSI,
  },
  {
    item: {
      id: 'HYD_PTU_FAULT',
      color: 'CAUTION',
      title: 'HYD PTU FAULT',
      sdPage: 'HYD',
    },
    present: (s) => s.failures.some((f) => f.kind === 'HYD_PTU_FAULT'),
  },
  {
    item: {
      id: 'EXCESS_CAB_ALT',
      color: 'WARNING',
      title: 'CAB PR EXCESS CAB ALT',
      sdPage: 'PRESS',
    },
    present: (s) => s.press.cabinAltFt > PRESS.EXCESS_CAB_ALT_FT,
  },
  {
    item: { id: 'CAB_PR_LO_DIFF_PR', color: 'CAUTION', title: 'CAB PR LO DIFF PR', sdPage: 'PRESS' },
    // Low cabin/ambient differential while at altitude (not on the ground).
    present: (s) =>
      s.kinematics.altFt > 10000 && s.press.diffPsi < PRESS.LO_DIFF_PR_PSI,
  },
  {
    item: { id: 'AIR_PACK_1_FAULT', color: 'CAUTION', title: 'AIR PACK 1 FAULT', sdPage: 'BLEED' },
    present: (s) => !s.press.pack1,
  },
  {
    item: { id: 'AIR_PACK_2_FAULT', color: 'CAUTION', title: 'AIR PACK 2 FAULT', sdPage: 'BLEED' },
    present: (s) => !s.press.pack2,
  },
  {
    item: { id: 'CAB_PR_SYS_1_2_FAULT', color: 'CAUTION', title: 'CAB PR SYS 1+2 FAULT', sdPage: 'PRESS' },
    present: (s) => {
      const f1 = s.failures.some((f) => f.kind === 'CAB_PR_SYS_FAULT' && f.sys === 1);
      const f2 = s.failures.some((f) => f.kind === 'CAB_PR_SYS_FAULT' && f.sys === 2);
      return f1 && f2;
    },
  },
  {
    item: {
      id: 'ENG1_FIRE',
      color: 'WARNING',
      title: 'ENG 1 FIRE',
      sdPage: 'ENG',
    },
    present: (s) => s.failures.some((f) => f.kind === 'ENG_FIRE' && f.engine === 1),
  },
  {
    item: {
      id: 'ENG2_FIRE',
      color: 'WARNING',
      title: 'ENG 2 FIRE',
      sdPage: 'ENG',
    },
    present: (s) => s.failures.some((f) => f.kind === 'ENG_FIRE' && f.engine === 2),
  },

  // ── ELEC (ATA 24) ──────────────────────────────────────────────────────
  {
    item: { id: 'ELEC_EMER_CONFIG', color: 'WARNING', title: 'ELEC EMER CONFIG', sdPage: 'ELEC' },
    present: (s) => s.elec.emerConfig,
  },
  {
    item: { id: 'ELEC_GEN_1_FAULT', color: 'CAUTION', title: 'ELEC GEN 1 FAULT', sdPage: 'ELEC' },
    // GEN 1 not supplying while ENG 1 is running (and not already in emer config).
    present: (s) =>
      !s.elec.emerConfig &&
      (s.engines[0]?.running ?? false) &&
      (!s.elec.gen1.on || s.elec.gen1.fault),
  },
  {
    item: { id: 'ELEC_GEN_2_FAULT', color: 'CAUTION', title: 'ELEC GEN 2 FAULT', sdPage: 'ELEC' },
    present: (s) =>
      !s.elec.emerConfig &&
      (s.engines[1]?.running ?? false) &&
      (!s.elec.gen2.on || s.elec.gen2.fault),
  },
  {
    item: { id: 'ELEC_AC_BUS_1_FAULT', color: 'CAUTION', title: 'ELEC AC BUS 1 FAULT', sdPage: 'ELEC' },
    present: (s) => !s.elec.emerConfig && !s.elec.acBus1,
  },
  {
    item: { id: 'ELEC_AC_BUS_2_FAULT', color: 'CAUTION', title: 'ELEC AC BUS 2 FAULT', sdPage: 'ELEC' },
    present: (s) => !s.elec.emerConfig && !s.elec.acBus2,
  },
  {
    item: { id: 'ELEC_TR_1_FAULT', color: 'CAUTION', title: 'ELEC TR 1 FAULT', sdPage: 'ELEC' },
    present: (s) => !s.elec.emerConfig && !s.elec.tr1,
  },
  {
    item: { id: 'ELEC_TR_2_FAULT', color: 'CAUTION', title: 'ELEC TR 2 FAULT', sdPage: 'ELEC' },
    present: (s) => !s.elec.emerConfig && !s.elec.tr2,
  },
];
