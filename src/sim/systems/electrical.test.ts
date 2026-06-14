import { describe, it, expect } from 'vitest';
import { createInitialState } from '../initialState';
import { deriveElectrical } from './electrical';
import type { AircraftState } from '../types';

describe('electrical derivation (pure)', () => {
  it('powers both AC busses from the generators at steady state', () => {
    const d = deriveElectrical(createInitialState());
    expect(d.acBus1).toBe(true);
    expect(d.acBus2).toBe(true);
    expect(d.busTie).toBe(false);
    expect(d.emerConfig).toBe(false);
    expect(d.dcBus1).toBe(true);
    expect(d.dcBus2).toBe(true);
  });

  it('keeps both AC busses powered via the bus tie when GEN 1 trips', () => {
    const s = createInitialState();
    s.elec.gen1.fault = true;
    const d = deriveElectrical(s);
    expect(d.acBus1).toBe(true); // cross-fed from GEN 2
    expect(d.acBus2).toBe(true);
    expect(d.busTie).toBe(true);
    expect(d.emerConfig).toBe(false);
  });

  it('enters EMER CONFIG and deploys the RAT when both generators are lost', () => {
    const s = createInitialState();
    s.elec.gen1.fault = true;
    s.elec.gen2.fault = true;
    const d = deriveElectrical(s);
    expect(d.emerConfig).toBe(true);
    expect(d.ratDeployed).toBe(true);
    expect(d.acBus1).toBe(false);
    expect(d.acBus2).toBe(false);
    expect(d.acEss).toBe(true); // emer gen
    expect(d.dcEss).toBe(true); // emer gen / batteries
  });

  it('recovers from dual-gen loss when the APU generator comes online', () => {
    const s = createInitialState();
    s.elec.gen1.fault = true;
    s.elec.gen2.fault = true;
    s.elec.apuGen = { on: true, available: true };
    const d = deriveElectrical(s);
    expect(d.emerConfig).toBe(false);
    expect(d.acBus1).toBe(true);
    expect(d.acBus2).toBe(true);
  });

  it('drops the affected AC bus (and its TR) on a bus fault', () => {
    const s = createInitialState();
    s.failures.push({ kind: 'ELEC_AC_BUS_FAULT', bus: 1 });
    const d = deriveElectrical(s);
    expect(d.acBus1).toBe(false);
    expect(d.acBus2).toBe(true);
    expect(d.tr1).toBe(false);
    // DC BUS 1 still fed via the DC tie from TR 2.
    expect(d.dcBus1).toBe(true);
  });

  it('drops a TR on a TR fault but leaves its AC bus powered', () => {
    const s: AircraftState = createInitialState();
    s.failures.push({ kind: 'ELEC_TR_FAULT', tr: 1 });
    const d = deriveElectrical(s);
    expect(d.acBus1).toBe(true);
    expect(d.tr1).toBe(false);
    expect(d.dcBus1).toBe(true); // cross-tied from TR 2
  });
});
