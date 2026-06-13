import { describe, it, expect } from 'vitest';
import { createInitialState } from '../initialState';
import { deriveHydraulics } from './hydraulics';
import { HYD } from '../constants';

describe('hydraulics derivation (pure)', () => {
  it('builds nominal pressure when pump on, reservoir full, engine running', () => {
    const s = createInitialState();
    expect(deriveHydraulics(s).greenPsi).toBe(HYD.NOMINAL_PSI);
  });

  it('drops GREEN pressure to zero when the eng-1 pump is off', () => {
    const s = createInitialState();
    s.hyd.green.pumpOn = false;
    expect(deriveHydraulics(s).greenPsi).toBe(0);
  });

  it('drops GREEN pressure when its driving engine (ENG 1) is shut down', () => {
    const s = createInitialState();
    s.engines[0].running = false;
    expect(deriveHydraulics(s).greenPsi).toBe(0);
  });

  it('drops pressure when the reservoir falls below the usable minimum', () => {
    const s = createInitialState();
    s.hyd.green.reservoirFrac = HYD.RESERVOIR_MIN_FRAC; // not strictly above
    expect(deriveHydraulics(s).greenPsi).toBe(0);
  });

  it('runs the PTU when GREEN is low and YELLOW can supply (and armed)', () => {
    const s = createInitialState();
    s.hyd.green.pumpOn = false; // green low
    expect(deriveHydraulics(s).ptuRunning).toBe(true);
  });

  it('does not run the PTU when it is not armed', () => {
    const s = createInitialState();
    s.hyd.green.pumpOn = false;
    s.hyd.ptu.armed = false;
    expect(deriveHydraulics(s).ptuRunning).toBe(false);
  });

  it('does not run the PTU when both systems are healthy', () => {
    const s = createInitialState();
    expect(deriveHydraulics(s).ptuRunning).toBe(false);
  });
});
