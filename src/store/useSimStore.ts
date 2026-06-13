import { create } from 'zustand';
import type {
  AircraftState,
  SimEvent,
  CrewAction,
  ActiveFailure,
} from '../sim/types';
import { createInitialState } from '../sim/initialState';
import { tick } from '../sim/tick';
import { StepAccumulator, FIXED_DT } from '../sim/clock';
import { crewAction as mkCrewAction, failureInject } from '../sim/events';

/**
 * The single store. It owns the wall-clock → fixed-step loop and exposes the
 * crew/failure input surface. All sim logic lives in the pure modules under
 * `src/sim`; this file is the only place React, Zustand and the loop meet.
 *
 * `state` is the latest sim state; `prevState` is the one before it, so the
 * render layer can interpolate (decision #3). `alpha` is the blend factor.
 */
interface SimStore {
  state: AircraftState;
  prevState: AircraftState;
  alpha: number;
  running: boolean;

  start: () => void;
  stop: () => void;
  reset: () => void;
  injectFailure: (failure: ActiveFailure) => void;
  sendCrewAction: (action: CrewAction) => void;
}

// Module-scoped loop machinery (not part of the reactive state).
const accumulator = new StepAccumulator();
const pending: SimEvent[] = [];
let rafId: number | null = null;
let lastTime = 0;

export const useSimStore = create<SimStore>((set, get) => {
  function step(now: number) {
    if (!get().running) return;

    const frameSeconds = (now - lastTime) / 1000;
    lastTime = now;

    const steps = accumulator.advance(frameSeconds);
    if (steps > 0) {
      let prev = get().state;
      let current = prev;
      for (let i = 0; i < steps; i++) {
        prev = current;
        // Fresh draft each step so React sees a new reference and the previous
        // sim state survives for interpolation.
        const draft = structuredClone(current);
        const events = pending.splice(0, pending.length);
        current = tick(draft, FIXED_DT, events);
      }
      set({ state: current, prevState: prev, alpha: accumulator.alpha });
    } else {
      set({ alpha: accumulator.alpha });
    }

    rafId = requestAnimationFrame(step);
  }

  return {
    state: createInitialState(),
    prevState: createInitialState(),
    alpha: 0,
    running: false,

    start: () => {
      if (get().running) return;
      lastTime = performance.now();
      accumulator.reset();
      set({ running: true });
      rafId = requestAnimationFrame(step);
    },

    stop: () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = null;
      set({ running: false });
    },

    reset: () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = null;
      pending.length = 0;
      accumulator.reset();
      set({
        state: createInitialState(),
        prevState: createInitialState(),
        alpha: 0,
        running: false,
      });
    },

    injectFailure: (failure) => {
      const t = get().state.clock.t;
      pending.push(failureInject(t, failure));
    },

    sendCrewAction: (action) => {
      const t = get().state.clock.t;
      pending.push(mkCrewAction(t, action));
    },
  };
});
