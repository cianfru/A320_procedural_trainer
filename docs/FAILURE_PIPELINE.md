# Failure Implementation Pipeline

How we add every A320 failure **consistently**. This is process, not suggestion —
the catalog-integrity test (`src/sim/catalog/registry.test.ts`) enforces the
parts that can be enforced.

## The one rule that makes it consistent

> **A failure never says "show message X."** (Spec invariant #2.)

A failure sets a **condition** or a **rate**. The system model **derives** the
consequence. The FWC **raises** the ECAM message from state. The procedure
**clears** its action lines from state. Nothing downstream is authored. This is
what lets one engine serve every scenario, and it's why adding the 200th failure
is as cheap as the 2nd.

## Sourcing posture: clean-room

FlyByWire A32NX and the FCOM/QRH are **behavioral oracles** — read them to learn
*what the jet does* (thresholds, messages, reconfiguration). We write our own
code. We do **not** copy FBW source (it is GPL-3.0; copying would force this
project to be GPL too). Behavior and threshold facts are not copyrightable;
FCOM-derived behavior is literally our spec (§6).

## The six links (every `implemented` failure has all six)

```
1. CATALOG ENTRY   src/sim/catalog/registry.ts   id, ata, system, raises, refs, status
2. INJECTION       src/sim/types.ts (ActiveFailure) + events.ts   sets condition/rate ONLY
3. SYSTEM MODEL    src/sim/systems/* + integrator.ts              derives the consequence
4. FWC CONDITION   src/sim/fwc/conditions.ts                      raises EcamItem from state
5. ECAM PROCEDURE  src/sim/fwc/procedures.ts                      SENSED / MANUAL action lines
6. TESTS           *.test.ts                                      assert SEMANTIC ids, not text
```

Plus **VALIDATE**: cross-check thresholds/wording against FCOM/QRH/FBW; clear the
`// VALIDATE` tag and the entry's `validate` field when confirmed.

## Status ladder

| Status | Means | Integrity test requires |
|---|---|---|
| `planned` | catalogued only (the backlog) | no builder |
| `partial` | injection + FWC condition exist; procedure/tests pending | builder; every `raises` id ∈ condition table |
| `implemented` | all six links present | the above **and** every `raises` id has a procedure |

## Step-by-step: adding one failure

1. **Catalog it** — add/locate the entry in `registry.ts`. Start `planned`.
2. **Model the system** so the consequence can be *derived* (extend the relevant
   `systems/*` module + `integrator.ts`). If the system isn't modelled yet, that
   system is the real unit of work — do it in roadmap order (HYD→ELEC→BLEED/AIR→
   FUEL→F/CTL→…, decision #4).
3. **Add the injection** — an `ActiveFailure` variant (condition/rate) and its
   `events.ts` apply branch. Give the catalog entry a `build()`. → `partial`.
4. **Add the FWC condition** — a predicate over state in `conditions.ts` that
   returns the `EcamItem`. List its id in the entry's `raises`.
5. **Write the procedure** — action lines in `procedures.ts`. SENSED lines get a
   `done(state)` predicate; MANUAL lines are overflown via `ECAM_ACK_LINE`.
   → `implemented`.
6. **Test** — derivation truth table, FWC transition (raise/latch/clear), and a
   tick-pipeline scenario. Assert semantic ids (`HYD_G_SYS_LO_PR`), never text.
7. **Validate** — confirm numbers/wording against the oracle; clear the tags.

## What "full procedure logic" means here

A SENSED line clears when the demanded system state is reached — the crew does
the action, state changes, the line clears (same mechanism, no authoring). A
MANUAL line is overflown by the crew (`ECAM_ACK_LINE`). A procedure is
`complete` when all its lines are done; the item can then be cleared to STATUS.
The sequencer is `src/sim/fwc/ecamActions.ts`.

## Worked reference: ATA 29 Hydraulics

The HYD chapter is fully implemented and is the template to copy: pump LO PR and
reservoir leak for each circuit, PTU fault, each raising a `HYD … SYS LO PR` /
`HYD PTU FAULT` caution with a procedure. See the HYD entries in `registry.ts`
and the tests in `src/sim/{systems,fwc,catalog}`.
