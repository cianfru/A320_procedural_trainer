import { describe, it, expect } from 'vitest';
import { createInitialState } from './initialState';
import { tick } from './tick';
import { FIXED_DT } from './clock';
import { failureInject, crewAction } from './events';
import type { AircraftState } from './types';

function runFor(state: AircraftState, seconds: number): AircraftState {
  const steps = Math.round(seconds / FIXED_DT);
  let s = state;
  for (let i = 0; i < steps; i++) s = tick(s, FIXED_DT);
  return s;
}

describe('tick pipeline (end-to-end, GREEN HYD scenario)', () => {
  it('injecting GREEN ENG1 PUMP failure cascades to a latched caution', () => {
    let s = createInitialState();

    // Steady state: silent.
    s = runFor(s, 1);
    expect(s.fwc.active).toHaveLength(0);

    // Inject the failure at t≈now (event applied on the next tick).
    s = tick(s, FIXED_DT, [failureInject(s.clock.t, { kind: 'HYD_PUMP_LOPR', circuit: 'green' })]);
    s = runFor(s, 1);

    // Event log recorded the injection (determinism substrate).
    expect(s.eventLog.some((e) => e.kind === 'FAILURE_INJECT')).toBe(true);
    // Pressure derived to zero, caution latched, SD auto-called to HYD.
    expect(s.hyd.green.pressurePsi).toBe(0);
    expect(s.fwc.active.map((i) => i.id)).toContain('HYD_G_SYS_LO_PR');
    expect(s.fwc.masterCaut).toBe(true);
    expect(s.fwc.sdPage).toBe('HYD');
    // PTU auto-ran (yellow still supplying).
    expect(s.hyd.ptu.running).toBe(true);
  });

  it('a progressive GREEN leak drains the reservoir until pressure is lost', () => {
    let s = createInitialState();
    // Drain 0.25/min → ~4 min to empty. Pressure holds until reservoir < min.
    s = tick(s, FIXED_DT, [
      failureInject(s.clock.t, {
        kind: 'HYD_LEAK',
        circuit: 'green',
        reservoirDrainFracPerMin: 6,
      }),
    ]);

    s = runFor(s, 5); // 5 s at 6/min → 0.5 drained, still above min
    expect(s.hyd.green.pressurePsi).toBeGreaterThan(0);

    s = runFor(s, 6); // total ~11 s → ~1.1 drained → empty
    expect(s.hyd.green.reservoirFrac).toBe(0);
    expect(s.hyd.green.pressurePsi).toBe(0);
    expect(s.fwc.active.map((i) => i.id)).toContain('HYD_G_SYS_LO_PR');
  });

  it('a crew action (restore pump) clears the caution', () => {
    let s = createInitialState();
    s = tick(s, FIXED_DT, [failureInject(s.clock.t, { kind: 'HYD_PUMP_LOPR', circuit: 'green' })]);
    s = runFor(s, 1);
    expect(s.fwc.active.map((i) => i.id)).toContain('HYD_G_SYS_LO_PR');

    s = tick(s, FIXED_DT, [
      crewAction(s.clock.t, { kind: 'HYD_PUMP', sys: 'green', on: true }),
    ]);
    s = runFor(s, 1);
    expect(s.hyd.green.pressurePsi).toBeGreaterThan(0);
    expect(s.fwc.active.map((i) => i.id)).not.toContain('HYD_G_SYS_LO_PR');
  });
});
