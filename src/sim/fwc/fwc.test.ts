import { describe, it, expect } from 'vitest';
import { createInitialState } from '../initialState';
import { deriveSystems } from '../systems';
import { reduceFwc } from './fwc';
import { FWC } from '../constants';
import type { AircraftState, FwcState } from '../types';

const DT = 0.1;

/** Advance the FWC `n` ticks against the current derived state. */
function run(state: AircraftState, fwc: FwcState, n: number): FwcState {
  let f = fwc;
  for (let i = 0; i < n; i++) {
    deriveSystems(state);
    f = reduceFwc(f, state, DT);
  }
  return f;
}

function activeIds(f: FwcState): string[] {
  return f.active.map((i) => i.id);
}

describe('FWC reducer (stateful)', () => {
  it('stays silent at steady state', () => {
    const s = createInitialState();
    const f = run(s, s.fwc, 5);
    expect(activeIds(f)).toEqual([]);
    expect(f.masterCaut).toBe(false);
    expect(f.masterWarn).toBe(false);
  });

  it('raises HYD G SYS LO PR only after the confirmation delay', () => {
    const s = createInitialState();
    s.hyd.green.pumpOn = false; // pressure will derive to 0

    const ticksToConfirm = Math.ceil(FWC.DEFAULT_CONFIRM_S / DT);

    // One tick short of the debounce: still silent.
    let f = run(s, s.fwc, ticksToConfirm - 1);
    expect(activeIds(f)).not.toContain('HYD_G_SYS_LO_PR');

    // One more tick: annunciates and latches the master caution + queues SC.
    f = run(s, f, 1);
    expect(activeIds(f)).toContain('HYD_G_SYS_LO_PR');
    expect(f.masterCaut).toBe(true);
    expect(f.sdPage).toBe('HYD');
  });

  it('edge-triggers the aural once, not every tick', () => {
    const s = createInitialState();
    s.hyd.green.pumpOn = false;
    let f = run(s, s.fwc, 10);
    // After the rising edge, subsequent ticks drain the aural queue.
    expect(f.auralsPending).toEqual([]);
    // Re-run a single tick: condition still present but already annunciated,
    // so no new aural is queued.
    f = run(s, f, 1);
    expect(f.auralsPending).toEqual([]);
  });

  it('clears the caution when the condition is resolved', () => {
    const s = createInitialState();
    s.hyd.green.pumpOn = false;
    let f = run(s, s.fwc, 10);
    expect(activeIds(f)).toContain('HYD_G_SYS_LO_PR');

    s.hyd.green.pumpOn = true; // crew restored the pump
    f = run(s, f, 2);
    expect(activeIds(f)).not.toContain('HYD_G_SYS_LO_PR');
  });

  it('raises a red WARNING (CAB ALT) with master warn, ranked above cautions for SD', () => {
    const s = createInitialState();
    s.hyd.green.pumpOn = false; // a caution → HYD page
    s.press.cabinAltFt = 12000; // a warning → PRESS page

    const f = run(s, s.fwc, 10);
    expect(activeIds(f)).toContain('EXCESS_CAB_ALT');
    expect(f.masterWarn).toBe(true);
    // Warning outranks caution for the auto-called SD page.
    expect(f.sdPage).toBe('PRESS');
  });
});
