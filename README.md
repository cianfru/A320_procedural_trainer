# A320 Procedural Trainer

A browser-based, FCOM-accurate **systems-and-procedures** trainer for the A320 —
accurate, but not flown. Public, free, accessible to all.

> **Not an approved or certified training device.** Familiarisation and
> procedural rehearsal only.

See [`claude.md`](./claude.md) for the full architecture & roadmap.

## Quick start

```bash
npm install
npm run dev        # dev server
npm test           # run the unit tests (derivation + FWC + tick pipeline)
npm run typecheck  # tsc, no emit
npm run build      # production static build → dist/
```

## What's here (skeleton: Stage 1 + Stage 2 seams)

The one-way data flow from the spec is wired end-to-end, with the **GREEN HYD**
failure as the proven vertical slice:

```
failures + crew actions → STATE → integrate → derive (pure) → FWC (stateful) → displays
```

| Area | Module | Notes |
|---|---|---|
| State shape | `src/sim/types.ts` | single source of truth |
| Tick sequence | `src/sim/tick.ts` | the load-bearing order (spec §2.1) |
| Fixed-step clock | `src/sim/clock.ts` | 10 Hz accumulator + render alpha |
| Event apply | `src/sim/events.ts` | only writer of conditions/rates/targets |
| Integrator | `src/sim/integrator.ts` | only writer of continuous quantities |
| Systems derivation | `src/sim/systems/` | pure; GREEN HYD + PTU auto-reconfig |
| FWC | `src/sim/fwc/` | stateful reducer: debounce, latch, aurals, SD auto-call |
| Store + loop | `src/store/useSimStore.ts` | Zustand + rAF, the only React/sim seam |
| Displays | `src/displays/` | EWD + SD live; PFD/ND placeholders |
| Instructor panel | `src/ui/ControlPanel.tsx` | failure injection + crew actions |

**Try it:** `npm run dev`, hit **GREEN ENG1 PUMP LO PR** — pressure derives to 0,
the FWC raises `HYD G SYS LO PR` after its confirmation delay, MASTER CAUT
latches, the SD auto-calls the HYD page, and the PTU runs. Restore the pump to
clear it. No consequence is authored anywhere — it's all derived from state.

### Invariants honoured
- **Tick-based from day one** — the clock runs even at steady state.
- **Consequences are derived/integrated/reduced, never authored** — a failure
  sets conditions/rates only; derivation drops pressure; the FWC raises the caution.

### Next (per roadmap)
Stage 2 finish: full E/WD memo + aural layer, refactor onto event-log replay.
Stage 3: emergency descent (the dynamic-family milestone) + basic guidance layer.

## Validation

Unvalidated numeric thresholds are centralised in `src/sim/constants.ts` and
tagged `// VALIDATE` with a source field (spec §6).
