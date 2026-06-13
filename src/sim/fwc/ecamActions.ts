import type { AircraftState, FwcState, ProcedureProgress } from '../types';
import { PROCEDURES } from './procedures';

/**
 * ECAM ACTIONS sequencer — tick step 4b (runs right after the FWC reducer).
 *
 * Advances each active item's procedure: SENSED lines clear when their state
 * predicate is satisfied (invariant #2 — completion is derived, never
 * authored); MANUAL lines are completed by the crew via ECAM_ACK_LINE in the
 * event layer. Progress for stale items (no longer active or in STATUS) is
 * pruned so the slice stays bounded.
 *
 * Owns only the `procedures` part of the annunciation slice.
 */
export function reduceEcamActions(
  prev: FwcState,
  state: AircraftState,
): FwcState {
  const procedures: Record<string, ProcedureProgress> = {};
  const live = new Set([...prev.active, ...prev.cleared].map((i) => i.id));

  // Carry forward progress only for items still live.
  for (const [id, progress] of Object.entries(prev.procedures)) {
    if (live.has(id)) procedures[id] = progress;
  }

  for (const item of prev.active) {
    const proc = PROCEDURES[item.id];
    if (!proc) continue;

    const carried = procedures[item.id];
    const done = new Set(carried?.completedLineIds ?? []);

    for (const line of proc.lines) {
      if (line.type === 'SENSED' && !done.has(line.id) && line.done?.(state)) {
        done.add(line.id);
      }
    }

    procedures[item.id] = {
      completedLineIds: [...done],
      complete: proc.lines.every((l) => done.has(l.id)),
    };
  }

  return { ...prev, procedures };
}

/** First not-yet-completed line of a procedure — what the display points at. */
export function activeLineId(
  fwc: FwcState,
  itemId: string,
): string | null {
  const proc = PROCEDURES[itemId];
  if (!proc) return null;
  const done = new Set(fwc.procedures[itemId]?.completedLineIds ?? []);
  return proc.lines.find((l) => !done.has(l.id))?.id ?? null;
}
