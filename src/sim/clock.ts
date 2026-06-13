import { TICK_HZ } from './types';

/**
 * Fixed-timestep accumulator (spec §5, decision #3).
 *
 * Decouples the deterministic sim rate (10 Hz) from the render rate (rAF). Feed
 * it real elapsed wall-clock time; it returns how many fixed steps to run and
 * the interpolation alpha for the render layer to blend the last two sim states.
 *
 * Framework-agnostic — the store wires it to requestAnimationFrame, tests can
 * drive it manually. A spiral-of-death guard caps catch-up steps.
 */
export const FIXED_DT = 1 / TICK_HZ; // seconds per sim step

const MAX_STEPS_PER_FRAME = 5; // catch-up cap (avoids spiral of death)

export class StepAccumulator {
  private acc = 0;

  /**
   * @param frameSeconds wall-clock elapsed since the last call.
   * @returns number of fixed steps to run this frame.
   */
  advance(frameSeconds: number): number {
    // Clamp pathological frames (tab backgrounded, debugger pause, etc.).
    this.acc += Math.min(frameSeconds, MAX_STEPS_PER_FRAME * FIXED_DT);
    let steps = 0;
    while (this.acc >= FIXED_DT && steps < MAX_STEPS_PER_FRAME) {
      this.acc -= FIXED_DT;
      steps++;
    }
    return steps;
  }

  /** Fractional progress toward the next step, 0..1, for render interpolation. */
  get alpha(): number {
    return this.acc / FIXED_DT;
  }

  reset(): void {
    this.acc = 0;
  }
}
