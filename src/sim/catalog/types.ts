import type { ActiveFailure } from '../types';

/**
 * The failure catalog — the single tracked backlog and the consistency
 * contract for "implement every A320 failure" (see docs/FAILURE_PIPELINE.md).
 *
 * Every A320 ECAM failure gets ONE entry here, whether or not it is coded yet.
 * The `status` field is the source of truth for progress; the catalog-integrity
 * test (`registry.test.ts`) mechanically enforces that an entry's status
 * matches how completely it is wired, so nothing can be half-implemented
 * silently.
 */

export type SystemId =
  | 'HYD' // 29
  | 'ELEC' // 24
  | 'BLEED' // 36
  | 'AIR' // 21 (air conditioning)
  | 'PRESS' // 21 (pressurisation)
  | 'FUEL' // 28
  | 'FCTL' // 27
  | 'ENG' // 70-80
  | 'APU' // 49
  | 'FIRE' // 26
  | 'ICE' // 30
  | 'NAV' // 34 (ADIRS / sensors)
  | 'LGEAR' // 32
  | 'AUTOFLT'; // 22

/**
 * - `implemented`: all six pipeline links present — builder, system model,
 *   FWC condition(s), ECAM procedure, tests, and a validation status.
 * - `partial`: injection + FWC condition exist, but procedure and/or tests
 *   are still pending. Runnable, not finished.
 * - `planned`: catalogued only (the backlog). No code yet.
 */
export type FailureStatus = 'implemented' | 'partial' | 'planned';

export interface FailureCatalogEntry {
  /** Stable catalog id, SCREAMING_SNAKE, unique across the whole catalog. */
  id: string;
  /** ATA chapter, e.g. '29' for hydraulics. */
  ata: string;
  system: SystemId;
  /** Menu / human label. */
  title: string;
  status: FailureStatus;
  /**
   * Semantic EcamItem ids this failure is expected to raise. For implemented/
   * partial entries these must exist in the FWC condition table; for planned
   * entries they document the intended annunciation.
   */
  raises: string[];
  /** Sourcing references (clean-room oracle, not code to copy). */
  refs?: { fcom?: string; qrh?: string; fbw?: string };
  /** Open validation note (mirrors the `// VALIDATE` discipline, spec §6). */
  validate?: string;
  /**
   * Builder — present iff the failure is runnable (implemented/partial).
   * Turns optional menu params into a concrete ActiveFailure for injection.
   */
  build?: (params?: Record<string, number>) => ActiveFailure;
}
