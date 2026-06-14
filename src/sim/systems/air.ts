import type { AircraftState } from '../types';
import { PRESS } from '../constants';

/**
 * Air conditioning / pressurisation derivation (ATA 21) — pure, stateless.
 * Computes pack operative state and the automatic passenger-oxygen-mask deploy.
 * The cabin-altitude trajectory itself is integrated (integrator.ts); this
 * layer derives the discrete consequences from it.
 */
export interface AirDerivation {
  pack1: boolean;
  pack2: boolean;
  paxMasksDeployed: boolean;
}

export function deriveAir(state: AircraftState): AirDerivation {
  const p = state.press;
  const fault = (pack: 1 | 2) =>
    state.failures.some((f) => f.kind === 'AIR_PACK_FAULT' && f.pack === pack);

  const pack1 = p.pack1On && !fault(1);
  const pack2 = p.pack2On && !fault(2);

  // PAX masks auto-deploy above 14,000 ft cabin altitude and LATCH (they don't
  // stow when the cabin recovers). OR with current state to keep the latch.
  const paxMasksDeployed =
    p.paxMasksDeployed || p.cabinAltFt > PRESS.PAX_MASK_DEPLOY_FT;

  return { pack1, pack2, paxMasksDeployed };
}
