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

// ── ELEC (ATA 24) ──────────────────────────────────────────────────────────
/** ELEC GEN n FAULT procedure. */
function elecGenFault(gen: 1 | 2): EcamProcedure {
  return {
    itemId: `ELEC_GEN_${gen}_FAULT`,
    lines: [
      { id: `gen${gen}_offon`, text: `GEN ${gen} .......... OFF then ON`, type: 'MANUAL' },
      {
        id: `gen${gen}_off`,
        text: `GEN ${gen} .......... OFF`,
        type: 'SENSED',
        done: (s) => !(gen === 1 ? s.elec.gen1 : s.elec.gen2).on, // VALIDATE
      },
    ],
  };
}

/** ELEC AC BUS n FAULT procedure. */
function elecAcBusFault(bus: 1 | 2): EcamProcedure {
  return {
    itemId: `ELEC_AC_BUS_${bus}_FAULT`,
    lines: [{ id: `acbus${bus}_check`, text: `AFFECTED SYS .......... CHECK`, type: 'MANUAL' }],
  };
}

/** ELEC TR n FAULT procedure. */
function elecTrFault(tr: 1 | 2): EcamProcedure {
  return {
    itemId: `ELEC_TR_${tr}_FAULT`,
    lines: [{ id: `tr${tr}_monitor`, text: `AFFECTED SYS .......... MONITOR`, type: 'MANUAL' }],
  };
}

/** ELEC EMER CONFIG (memory items + actions). */
const elecEmerConfig: EcamProcedure = {
  itemId: 'ELEC_EMER_CONFIG',
  lines: [
    { id: 'emer_man_on', text: `EMER ELEC PWR (MAN ON) .... ON`, type: 'MANUAL' },
    {
      id: 'emer_rat_out',
      text: `RAT .......... OUT`,
      type: 'SENSED',
      done: (s) => s.elec.ratDeployed, // auto-deploys in emer config
    },
    { id: 'emer_gens', text: `GEN 1 + 2 .......... OFF then ON`, type: 'MANUAL' },
  ],
};

const ALL: EcamProcedure[] = [
  hydSysLoPr('green'),
  hydSysLoPr('blue'),
  hydSysLoPr('yellow'),
  hydPtuFault,
  elecGenFault(1),
  elecGenFault(2),
  elecAcBusFault(1),
  elecAcBusFault(2),
  elecTrFault(1),
  elecTrFault(2),
  elecEmerConfig,
];

export const PROCEDURES: Record<string, EcamProcedure> = Object.fromEntries(
  ALL.map((p) => [p.itemId, p]),
);
