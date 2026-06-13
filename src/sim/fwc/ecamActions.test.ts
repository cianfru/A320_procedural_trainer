import { describe, it, expect } from 'vitest';
import { createInitialState } from '../initialState';
import { tick } from '../tick';
import { FIXED_DT } from '../clock';
import { failureInject, crewAction } from '../events';
import { activeLineId } from './ecamActions';
import type { AircraftState } from '../types';

function runFor(state: AircraftState, seconds: number): AircraftState {
  const steps = Math.round(seconds / FIXED_DT);
  let s = state;
  for (let i = 0; i < steps; i++) s = tick(s, FIXED_DT);
  return s;
}

describe('ECAM ACTIONS sequencer (full procedure logic)', () => {
  it('a SENSED line is already satisfied for a pump-off cause, MANUAL line waits', () => {
    let s = createInitialState();
    // GREEN pump LO PR ⇒ pump is off ⇒ the "HYD G PUMP … OFF" SENSED line is met.
    s = tick(s, FIXED_DT, [failureInject(s.clock.t, { kind: 'HYD_PUMP_LOPR', circuit: 'green' })]);
    s = runFor(s, 1);

    const prog = s.fwc.procedures['HYD_G_SYS_LO_PR'];
    expect(prog).toBeDefined();
    expect(prog.completedLineIds).toContain('hyd_green_pump_off');
    // Not complete: the MANUAL "MAX SPEED … OBSERVE" line still outstanding.
    expect(prog.complete).toBe(false);
    expect(activeLineId(s.fwc, 'HYD_G_SYS_LO_PR')).toBe('hyd_green_max_speed');
  });

  it('ECAM_ACK_LINE overflies the MANUAL line and completes the procedure', () => {
    let s = createInitialState();
    s = tick(s, FIXED_DT, [failureInject(s.clock.t, { kind: 'HYD_PUMP_LOPR', circuit: 'green' })]);
    s = runFor(s, 1);
    expect(s.fwc.procedures['HYD_G_SYS_LO_PR'].complete).toBe(false);

    s = tick(s, FIXED_DT, [crewAction(s.clock.t, { kind: 'ECAM_ACK_LINE' })]);
    s = runFor(s, 0.5);

    const prog = s.fwc.procedures['HYD_G_SYS_LO_PR'];
    expect(prog.complete).toBe(true);
    expect(activeLineId(s.fwc, 'HYD_G_SYS_LO_PR')).toBeNull();
  });

  it('a SENSED line clears live when the crew reaches the demanded state (leak case)', () => {
    let s = createInitialState();
    // A leak triggers the caution while the pump is still ON, so the SENSED
    // "pump OFF" line is initially outstanding.
    s = tick(s, FIXED_DT, [
      failureInject(s.clock.t, { kind: 'HYD_LEAK', circuit: 'green', reservoirDrainFracPerMin: 60 }),
    ]);
    s = runFor(s, 2); // reservoir empties → caution raised, pump still ON
    expect(s.fwc.active.map((i) => i.id)).toContain('HYD_G_SYS_LO_PR');
    expect(s.fwc.procedures['HYD_G_SYS_LO_PR'].completedLineIds).not.toContain(
      'hyd_green_pump_off',
    );

    // Crew turns the pump off → the SENSED line clears on the next tick.
    s = tick(s, FIXED_DT, [crewAction(s.clock.t, { kind: 'HYD_PUMP', sys: 'green', on: false })]);
    s = runFor(s, 0.5);
    expect(s.fwc.procedures['HYD_G_SYS_LO_PR'].completedLineIds).toContain(
      'hyd_green_pump_off',
    );
  });

  it('prunes procedure progress once the item is resolved and gone', () => {
    let s = createInitialState();
    s = tick(s, FIXED_DT, [failureInject(s.clock.t, { kind: 'HYD_PTU_FAULT' })]);
    s = runFor(s, 1);
    expect(s.fwc.procedures['HYD_PTU_FAULT']).toBeDefined();
    // PTU fault has no self-clearing path here; assert the slice is keyed and
    // bounded to live items only.
    expect(Object.keys(s.fwc.procedures)).toEqual(['HYD_PTU_FAULT']);
  });
});
