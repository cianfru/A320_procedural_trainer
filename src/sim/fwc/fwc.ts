import type { AircraftState, FwcState, EcamItem, AuralId } from '../types';
import { FWC } from '../constants';
import { CONDITIONS } from './conditions';

/**
 * FWC reducer — tick step 4 (spec §2.1, §2 invariant #2).
 *
 * Stateful: `(prevFwc, aircraftState, dt) → nextFwc`. This is the one
 * subsystem that legitimately carries its own memory, because it must:
 *   - DEBOUNCE: a condition must persist `confirm` seconds before annunciating.
 *   - LATCH: a warning, once raised, stays until cleared (edge-triggered).
 *   - SINGLE-SHOT AURALS: CRC/SC fire once on the rising edge, then drain.
 *   - CLR/RECALL STACK: handled in event apply; the reducer respects it.
 *   - SD AUTO-CALL: the highest-priority active item drives the SD page.
 *
 * It is the ONLY writer of the annunciation slice. It receives only aircraft
 * state — never an authored "show X".
 *
 * Returns a new FwcState (pure w.r.t. its inputs); the store swaps it in.
 */
export function reduceFwc(
  prev: FwcState,
  state: AircraftState,
  dt: number,
): FwcState {
  const next: FwcState = {
    ...prev,
    active: [...prev.active],
    cleared: [...prev.cleared],
    confirmTimers: { ...prev.confirmTimers },
    auralsPending: [], // drained each tick; aural layer consumed last tick's
    inhibits: prev.inhibits,
  };

  const activeIds = new Set(next.active.map((i) => i.id));
  const clearedIds = new Set(next.cleared.map((i) => i.id));

  for (const cond of CONDITIONS) {
    const present = cond.present(state);
    const id = cond.item.id;

    if (!present) {
      // Condition gone: cancel any pending debounce and unlatch.
      delete next.confirmTimers[id];
      if (activeIds.has(id)) removeItem(next.active, id);
      if (clearedIds.has(id)) removeItem(next.cleared, id);
      continue;
    }

    // Already annunciated (active or cleared/STATUS) — nothing to re-trigger.
    if (activeIds.has(id) || clearedIds.has(id)) {
      delete next.confirmTimers[id];
      continue;
    }

    // Newly present: run the confirmation/debounce timer.
    const remaining = next.confirmTimers[id] ?? FWC.DEFAULT_CONFIRM_S;
    const left = remaining - dt;
    if (left > 0) {
      next.confirmTimers[id] = left;
      continue;
    }

    // Debounce elapsed → annunciate on this rising edge.
    delete next.confirmTimers[id];
    raise(next, cond.item);
  }

  // SD auto-call: highest-priority active item's page, else cruise/none.
  next.sdPage = pickSdPage(next.active) ?? prev.sdPage;

  return next;
}

/** Raise an item: append, latch the master light, queue the aural (single-shot). */
function raise(fwc: FwcState, item: EcamItem): void {
  fwc.active.push(item);
  if (item.color === 'WARNING') {
    fwc.masterWarn = true;
    queueAural(fwc, 'CRC');
  } else if (item.color === 'CAUTION') {
    fwc.masterCaut = true;
    queueAural(fwc, 'SC');
  }
}

function queueAural(fwc: FwcState, aural: AuralId): void {
  if (!fwc.auralsPending.includes(aural)) fwc.auralsPending.push(aural);
}

function removeItem(list: EcamItem[], id: string): void {
  const idx = list.findIndex((i) => i.id === id);
  if (idx >= 0) list.splice(idx, 1);
}

/** Warnings outrank cautions for SD auto-call; first wins within a class. */
function pickSdPage(active: EcamItem[]): EcamItem['sdPage'] | null {
  const warning = active.find((i) => i.color === 'WARNING' && i.sdPage);
  if (warning?.sdPage) return warning.sdPage;
  const caution = active.find((i) => i.color === 'CAUTION' && i.sdPage);
  if (caution?.sdPage) return caution.sdPage;
  return null;
}
