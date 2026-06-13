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
      id: 'HYD_Y_SYS_LO_PR',
      color: 'CAUTION',
      title: 'HYD Y SYS LO PR',
      sdPage: 'HYD',
    },
    present: (s) => s.hyd.yellow.pressurePsi < HYD.LO_PR_PSI,
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
];
