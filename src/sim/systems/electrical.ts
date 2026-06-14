import type { AircraftState } from '../types';

/**
 * Electrical derivation (ATA 24) — pure, stateless. `state → bus powering +
 * auto-reconfiguration`. This is the bus-loss reconfiguration family: every
 * downstream consequence (a dark bus, a tripped TR, the emergency
 * configuration) is DERIVED from source availability, never authored.
 *
 * Network (simplified but faithful):
 *   GEN1→AC BUS1, GEN2→AC BUS2; the bus-tie lets any single AC source feed both
 *   buses. APU GEN / EXT PWR can feed the tie. AC ESS normally off AC BUS1.
 *   TR1/TR2 rectify AC→DC for DC BUS1/2 (cross-tied). Batteries back the DC BAT
 *   bus. Loss of ALL main AC sources ⇒ EMER CONFIG: RAT deploys and the
 *   emergency generator powers the ESS busses; the main busses go dark.
 *
 * VALIDATE: contactor logic and ESS feed paths are simplified; refine against
 * FCOM 1.24 / A32NX electrical.
 */

export interface ElecDerivation {
  acBus1: boolean;
  acBus2: boolean;
  acEss: boolean;
  tr1: boolean;
  tr2: boolean;
  dcBus1: boolean;
  dcBus2: boolean;
  dcBat: boolean;
  dcEss: boolean;
  busTie: boolean;
  ratDeployed: boolean;
  emerConfig: boolean;
}

export function deriveElectrical(state: AircraftState): ElecDerivation {
  const e = state.elec;

  const gen1 = e.gen1.on && !e.gen1.fault && (state.engines[0]?.running ?? false);
  const gen2 = e.gen2.on && !e.gen2.fault && (state.engines[1]?.running ?? false);
  const apu = e.apuGen.on && e.apuGen.available;
  const ext = e.extPwr.on && e.extPwr.available;

  const anyAC = gen1 || gen2 || apu || ext;

  const acBus1Fault = hasBusFault(state, 1);
  const acBus2Fault = hasBusFault(state, 2);

  // With the bus tie, any available AC source can feed either bus.
  const acBus1 = !acBus1Fault && anyAC;
  const acBus2 = !acBus2Fault && anyAC;

  // Bus tie closes when a side is not fed by its own generator but another
  // source is available to cross-feed it.
  const busTie = anyAC && (!gen1 || !gen2);

  const emerConfig = !anyAC;
  const ratDeployed = emerConfig; // VALIDATE: real RAT also needs sufficient speed

  const acEss = emerConfig ? ratDeployed : acBus1 || acBus2;

  const tr1 = acBus1 && !hasTrFault(state, 1);
  const tr2 = acBus2 && !hasTrFault(state, 2);

  // DC busses are cross-tied through the DC bus tie contactor.
  const dcBus1 = tr1 || tr2;
  const dcBus2 = tr2 || tr1;

  const batAvail = e.bat1.on || e.bat2.on;
  const dcBat = dcBus1 || dcBus2 || batAvail;

  // ESS DC: from the ESS TR / emer gen in emer config, else from the DC network.
  const dcEss = emerConfig ? ratDeployed || batAvail : dcBus1 || dcBus2;

  return {
    acBus1,
    acBus2,
    acEss,
    tr1,
    tr2,
    dcBus1,
    dcBus2,
    dcBat,
    dcEss,
    busTie,
    ratDeployed,
    emerConfig,
  };
}

function hasBusFault(state: AircraftState, bus: 1 | 2): boolean {
  return state.failures.some((f) => f.kind === 'ELEC_AC_BUS_FAULT' && f.bus === bus);
}

function hasTrFault(state: AircraftState, tr: 1 | 2): boolean {
  return state.failures.some((f) => f.kind === 'ELEC_TR_FAULT' && f.tr === tr);
}
