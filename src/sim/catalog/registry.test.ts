import { describe, it, expect } from 'vitest';
import { FAILURE_CATALOG } from './registry';
import { CONDITIONS } from '../fwc/conditions';
import { PROCEDURES } from '../fwc/procedures';

/**
 * Catalog-integrity test — the consistency contract from the failure pipeline.
 *
 * This is the load-bearing guard: it makes it impossible to mark a failure
 * `implemented` without the full chain (builder → FWC condition → procedure)
 * actually being present. If you add a failure and skip a link, CI fails here.
 */

const conditionIds = new Set(CONDITIONS.map((c) => c.item.id));
const procedureIds = new Set(Object.keys(PROCEDURES));

describe('failure catalog integrity', () => {
  it('has unique catalog ids', () => {
    const ids = FAILURE_CATALOG.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every entry declares at least one raised ECAM item', () => {
    for (const e of FAILURE_CATALOG) {
      expect(e.raises.length, e.id).toBeGreaterThan(0);
    }
  });

  describe('runnable entries (implemented | partial)', () => {
    const runnable = FAILURE_CATALOG.filter((e) => e.status !== 'planned');

    it('have a builder that produces a failure with a kind', () => {
      for (const e of runnable) {
        expect(e.build, e.id).toBeDefined();
        const failure = e.build!();
        expect(failure.kind, e.id).toBeTruthy();
      }
    });

    it('only raise ECAM items that exist in the FWC condition table', () => {
      for (const e of runnable) {
        for (const id of e.raises) {
          expect(conditionIds.has(id), `${e.id} → ${id}`).toBe(true);
        }
      }
    });
  });

  describe('implemented entries (the full six-link contract)', () => {
    const implemented = FAILURE_CATALOG.filter((e) => e.status === 'implemented');

    it('exist (the HYD chapter is done)', () => {
      expect(implemented.length).toBeGreaterThan(0);
    });

    it('every raised item has an ECAM procedure', () => {
      for (const e of implemented) {
        for (const id of e.raises) {
          expect(procedureIds.has(id), `${e.id} → ${id} needs a procedure`).toBe(
            true,
          );
        }
      }
    });
  });

  it('planned entries carry no builder (catalogued only)', () => {
    for (const e of FAILURE_CATALOG.filter((e) => e.status === 'planned')) {
      expect(e.build, e.id).toBeUndefined();
    }
  });
});

describe('procedure ↔ condition coverage', () => {
  it('every procedure targets a real FWC condition', () => {
    for (const itemId of procedureIds) {
      expect(conditionIds.has(itemId), itemId).toBe(true);
    }
  });
});
