import { describe, it, expect } from 'vitest';
import { createInitialState } from '../initialState';
import { tick } from '../tick';
import { FIXED_DT } from '../clock';
import { failureInject, crewAction } from '../events';
import { PRESS } from '../constants';
import type { AircraftState, CrewAction } from '../types';

function runFor(state: AircraftState, seconds: number): AircraftState {
  const steps = Math.round(seconds / FIXED_DT);
  let s = state;
  for (let i = 0; i < steps; i++) s = tick(s, FIXED_DT);
  return s;
}
const ids = (s: AircraftState) => s.fwc.active.map((i) => i.id);
const send = (s: AircraftState, a: CrewAction) => tick(s, FIXED_DT, [crewAction(s.clock.t, a)]);

describe('emergency descent (dynamic scenario)', () => {
  it('holds a scheduled cabin altitude at steady-state cruise', () => {
    const s = runFor(createInitialState(), 20);
    expect(s.press.cabinAltFt).toBeLessThan(PRESS.EXCESS_CAB_ALT_FT);
    expect(ids(s)).not.toContain('EXCESS_CAB_ALT');
  });

  it('rapid depress drives cabin alt up, raises EXCESS CAB ALT (warning+CRC) and deploys pax masks', () => {
    let s = createInitialState();
    s = tick(s, FIXED_DT, [failureInject(s.clock.t, { kind: 'RAPID_DEPRESS', cabinClimbFpm: 12000 })]);
    s = runFor(s, 120); // cabin climbs toward FL370 ambient

    expect(s.press.cabinAltFt).toBeGreaterThan(PRESS.EXCESS_CAB_ALT_FT);
    expect(ids(s)).toContain('EXCESS_CAB_ALT');
    expect(s.fwc.masterWarn).toBe(true);
    expect(s.fwc.sdPage).toBe('PRESS');
    // pax masks auto-deployed above 14,000 ft and latch
    expect(s.press.paxMasksDeployed).toBe(true);
  });

  it('crew actions clear the EMER DESCENT procedure lines as state is reached', () => {
    let s = createInitialState();
    s = tick(s, FIXED_DT, [failureInject(s.clock.t, { kind: 'RAPID_DEPRESS', cabinClimbFpm: 12000 })]);
    s = runFor(s, 120);
    expect(s.fwc.procedures['EXCESS_CAB_ALT']).toBeDefined();

    s = send(s, { kind: 'CREW_OXY', on: true });
    s = send(s, { kind: 'SIGNS_ON' });
    s = send(s, { kind: 'SET_VS', fpm: -6000 });
    s = send(s, { kind: 'THR_IDLE' });
    s = send(s, { kind: 'SPEEDBRAKE', value: 1 });
    s = send(s, { kind: 'ENG_MODE_IGN', on: true });
    s = runFor(s, 1);

    const done = s.fwc.procedures['EXCESS_CAB_ALT'].completedLineIds;
    expect(done).toEqual(
      expect.arrayContaining(['crew_oxy', 'signs', 'descent', 'thr_idle', 'spd_brk', 'eng_ign']),
    );
  });

  it('descending the aircraft brings the cabin down (tracking ambient) and levels off at FL100', () => {
    let s = createInitialState();
    s = tick(s, FIXED_DT, [failureInject(s.clock.t, { kind: 'RAPID_DEPRESS', cabinClimbFpm: 12000 })]);
    s = runFor(s, 120);
    const peakCabin = s.press.cabinAltFt;
    expect(ids(s)).toContain('EXCESS_CAB_ALT');

    // Emergency descent at 6000 fpm from FL370 → ~4.5 min to FL100.
    s = send(s, { kind: 'SET_VS', fpm: -6000 });
    s = runFor(s, 300);

    expect(s.kinematics.altFt).toBe(10000); // levelled off at FL100
    expect(s.kinematics.vsFpm).toBe(0);
    // The dynamic: a depressurised cabin tracked the aircraft down toward ambient.
    expect(s.press.cabinAltFt).toBeLessThan(peakCabin - 20000);
    expect(s.press.cabinAltFt).toBeCloseTo(10000, -2);
    // Correct physics: at FL100 the cabin is ~10,000 ft, still above the 9,550 ft
    // threshold, so the warning persists — crew stays on oxygen until lower.
    expect(ids(s)).toContain('EXCESS_CAB_ALT');
  });

  it('a PACK fault raises AIR PACK FAULT and clears when the pack is selected off', () => {
    let s = createInitialState();
    s = tick(s, FIXED_DT, [failureInject(s.clock.t, { kind: 'AIR_PACK_FAULT', pack: 1 })]);
    s = runFor(s, 1);
    expect(ids(s)).toContain('AIR_PACK_1_FAULT');
    expect(s.fwc.procedures['AIR_PACK_1_FAULT'].completedLineIds).toContain('pack1_off');
  });
});
