import { describe, it, expect } from 'vitest';
import { createInitialState } from '../initialState';
import { tick } from '../tick';
import { FIXED_DT } from '../clock';
import { failureInject, crewAction } from '../events';
import type { AircraftState } from '../types';

function runFor(state: AircraftState, seconds: number): AircraftState {
  const steps = Math.round(seconds / FIXED_DT);
  let s = state;
  for (let i = 0; i < steps; i++) s = tick(s, FIXED_DT);
  return s;
}
const ids = (s: AircraftState) => s.fwc.active.map((i) => i.id);

describe('ELEC end-to-end (FWC + reconfiguration)', () => {
  it('GEN 1 fault raises GEN 1 FAULT, closes the bus tie, no bus-loss caution', () => {
    let s = createInitialState();
    s = runFor(s, 1);
    s = tick(s, FIXED_DT, [failureInject(s.clock.t, { kind: 'ELEC_GEN_FAULT', gen: 1 })]);
    s = runFor(s, 1);

    expect(ids(s)).toContain('ELEC_GEN_1_FAULT');
    expect(ids(s)).not.toContain('ELEC_AC_BUS_1_FAULT'); // tie keeps it powered
    expect(s.elec.busTie).toBe(true);
    expect(s.fwc.masterCaut).toBe(true);
    expect(s.fwc.sdPage).toBe('ELEC');
  });

  it('dual GEN loss raises EMER CONFIG (warning) and inhibits the gen-fault cautions', () => {
    let s = createInitialState();
    s = tick(s, FIXED_DT, [
      failureInject(s.clock.t, { kind: 'ELEC_GEN_FAULT', gen: 1 }),
      failureInject(s.clock.t, { kind: 'ELEC_GEN_FAULT', gen: 2 }),
    ]);
    s = runFor(s, 1);

    expect(ids(s)).toContain('ELEC_EMER_CONFIG');
    expect(ids(s)).not.toContain('ELEC_GEN_1_FAULT');
    expect(s.elec.ratDeployed).toBe(true);
    expect(s.fwc.masterWarn).toBe(true);
    // The EMER CONFIG procedure's RAT line auto-completes (sensed).
    expect(s.fwc.procedures['ELEC_EMER_CONFIG'].completedLineIds).toContain('emer_rat_out');
  });

  it('bringing the APU generator online clears EMER CONFIG', () => {
    let s = createInitialState();
    s = tick(s, FIXED_DT, [
      failureInject(s.clock.t, { kind: 'ELEC_GEN_FAULT', gen: 1 }),
      failureInject(s.clock.t, { kind: 'ELEC_GEN_FAULT', gen: 2 }),
    ]);
    s = runFor(s, 1);
    expect(ids(s)).toContain('ELEC_EMER_CONFIG');

    s = tick(s, FIXED_DT, [crewAction(s.clock.t, { kind: 'ELEC_APU_GEN', on: true })]);
    s = runFor(s, 1);
    expect(ids(s)).not.toContain('ELEC_EMER_CONFIG');
    expect(s.elec.acBus1).toBe(true);
  });
});
