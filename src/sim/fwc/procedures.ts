import type { EcamProcedure, HydCircuit } from '../types';

/**
 * ECAM ACTIONS — procedure definitions, keyed by EcamItem.id.
 *
 * These are DATA + completion predicates, not state. The actions sequencer
 * (`ecamActions.ts`) reads them and the FWC slice stores only progress.
 *
 * Discipline (see docs/FAILURE_PIPELINE.md): every `implemented` catalog entry
 * must resolve to at least one EcamItem that has a procedure here. The
 * catalog-integrity test enforces this.
 *
 * ⚠️ VALIDATE: action-line WORDING and step order below are representative
 * placeholders pending FCOM/QRH cross-check. Tests assert on line `id`s and
 * `type`s (semantic), never on `text`, so wording can be corrected freely.
 */

const CIRCUIT_LABEL: Record<HydCircuit, string> = {
  green: 'G',
  blue: 'B',
  yellow: 'Y',
};

/** HYD <C> SYS LO PR procedure (ATA 29). */
function hydSysLoPr(circuit: HydCircuit): EcamProcedure {
  const c = CIRCUIT_LABEL[circuit];
  return {
    itemId: `HYD_${c}_SYS_LO_PR`,
    lines: [
      {
        id: `hyd_${circuit}_pump_off`,
        text: `HYD ${c} PUMP .......... OFF`,
        type: 'SENSED',
        done: (s) => !s.hyd[circuit].pumpOn, // VALIDATE
      },
      {
        id: `hyd_${circuit}_max_speed`,
        text: `MAX SPEED .......... OBSERVE`,
        type: 'MANUAL', // crew overflies (no sensed cue)
      },
    ],
  };
}

/** HYD PTU FAULT procedure (ATA 29). */
const hydPtuFault: EcamProcedure = {
  itemId: 'HYD_PTU_FAULT',
  lines: [
    {
      id: 'hyd_ptu_off',
      text: `PTU .......... OFF`,
      type: 'SENSED',
      done: (s) => !s.hyd.ptu.armed, // VALIDATE
    },
  ],
};

const ALL: EcamProcedure[] = [
  hydSysLoPr('green'),
  hydSysLoPr('blue'),
  hydSysLoPr('yellow'),
  hydPtuFault,
];

export const PROCEDURES: Record<string, EcamProcedure> = Object.fromEntries(
  ALL.map((p) => [p.itemId, p]),
);
