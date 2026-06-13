# A320 Procedural Trainer — Architecture & Roadmap
**Status:** v0.2 — incorporates first review pass
**Identity in one line:** A browser-based, FCOM-accurate *systems-and-procedures* trainer for the A320 — accurate, but not flown. **Public, free, accessible to all.**

> **Changelog from v0.1**
> - Invariant #2 reworded: consequences are derived **or reduced**, never authored. The FWC is now an explicitly *stateful* subsystem, not a pure function.
> - Added the **tick sequence** (§2.1) and a **store write-ownership contract** (§2.2).
> - Added **event-sourced determinism** (§2.3): a timestamped action/injection log is the second half of reproducibility.
> - Resolved open decisions #1 (client-only), #2 (FBW reference config), #3 (10 Hz sim / interpolated render) — see §7.
> - Added §8: usability constraints that follow from "accessible to all" (guidance layer moves up the roadmap; disclaimer prominence).

---

## 1. What this is (and is not)

The defining constraint, because it sets the entire scope:

> **Kinematics, not aerodynamics. The aircraft is accurate but un-flown.**

We simulate how systems behave and how state evolves over time in response to crew actions. We do **not** simulate forces, moments, stall, buffet, or control feel.

**In scope**
- Faithful systems logic (HYD, ELEC, FUEL, BLEED/AIR, F/CTL state, pressurization, engines-as-state with spool lag).
- The FWC: warnings/cautions, ECAM actions, SD auto-call, flight-phase inhibits, aural alerts — modelled as a *stateful* subsystem.
- Four display units (PFD, ND, upper E/WD, lower SD) rendered from state.
- Both static failures and time-evolving emergency drills.
- Failure injection from a menu; an optional **guidance layer** (hints/highlights from the scenario's expected-action timeline) — promoted up the roadmap because of the public audience.
- Optional procedure scoring/instructor tooling later.

**Explicit non-goals (the scope fence)**
- Not hand-flyable; no 6-DOF flight model.
- Not a full FMS/RNAV computer (FMS-lite only, and late).
- **Not an approved/certified training device.** Familiarisation and procedural rehearsal only. *Because this is public, this disclaimer is placed where users actually see it — not buried.*

---

## 2. Core architecture

Six layers. The data flows one way: **failures + crew actions → state → integrator → derivation → displays.**

```
 ┌─────────────┐   ┌──────────────┐
 │  Failures   │   │ Crew actions │
 │ (inject)    │   │ (discrete)   │
 └──────┬──────┘   └──────┬───────┘
        │  appended as timestamped EVENTS
        ▼                 ▼
 ┌─────────────────────────────────┐
 │   STATE STORE (single source)   │◄── fixed-step clock (10 Hz)
 │   + FWC annunciation slice      │
 │   + ordered EVENT LOG           │
 └──────┬──────────────────────────┘
        │  integrate time-evolving quantities each tick
        ▼
 ┌─────────────────────────────────┐
 │  SYSTEMS DERIVATION (pure)      │  state → availabilities + auto-reconfig
 ├─────────────────────────────────┤
 │  FWC (stateful reducer)         │  (prevFwc, state) → nextFwc
 │  ECAM · aural · SD auto-call    │  latching · edge-triggered · timers
 └──────┬──────────────────────────┘
        ▼
 ┌─────────────────────────────────┐
 │  DISPLAYS  PFD · ND · EWD · SD   │  read-only; render-time interpolation
 └─────────────────────────────────┘
```

1. **State store** — one normalised aircraft-state object, the single source of truth, plus the FWC annunciation slice and the event log.
2. **Failure / injection layer** — the *only* way abnormal conditions enter. A failure sets conditions and **rates**, never consequences. Instantaneous (pump OFF) or rate-based (leak draining a reservoir; depress climbing cabin altitude).
3. **Integrator (the tick)** — advances time-evolving quantities each tick: cabin altitude from depress rate, aircraft altitude from V/S target, reservoir level from leak rate, O₂ from consumption, **engine N1 from a first-order spool lag toward commanded thrust**. Pure arithmetic. Crew actions change the rates/targets, not the values.
4. **Systems derivation** — deterministic, **stateless** functions: `state → consumer availabilities + auto-reconfiguration` (PTU run, RAT deploy, bus transfer). This is the GREEN-failure pattern, generalised.
5. **FWC** — a **stateful reducer** advanced each tick: `(prevFwcState, aircraftState) → nextFwcState`. Handles latching, the clear/recall stack, confirmation/debounce timers, single-shot aurals, SD auto-call sequencing, and flight-phase inhibits.
6. **Displays** — pure render of state + derived outputs, interpolating between the last two sim states for smooth tapes. No logic lives here.
7. **Scenario engine** — a scenario = initial state + injected failures + (for dynamic scenarios) a scripted timeline of triggers + expected crew actions for guidance/scoring.

### The two non-negotiable invariants

- **Tick-based from day one.** Even static scenarios run the clock; they just sit at steady state.
- **Consequences are always derived, integrated, or reduced — never authored.** No `failure → show message`. Set GREEN pressure to zero and let the FWC raise the caution. The FWC is allowed *its own state* (it must, to latch and edge-trigger), but it never receives an authored "show X" — only the aircraft state, from which it reasons. This is what lets one engine serve every scenario.

### 2.1 The tick sequence (load-bearing — fix the order)

Each fixed step, in this order:

1. **Apply queued events** — crew actions and failure injections from the log mutate conditions / rates / targets.
2. **Integrate** — advance all continuous quantities (cabin alt, aircraft alt, IAS/Mach, reservoir levels, O₂, engine spool).
3. **Systems derivation** (pure) — compute consumer availabilities and auto-reconfiguration; write back only the auto-reconfig flags.
4. **FWC reduce** — update annunciation state (active/cleared lists, timers, aurals-to-fire, SD page call).
5. **Displays read** — render reads state + FWC slice; render loop interpolates between this and the previous sim state.

### 2.2 Store write-ownership contract

There are **three** writers, not two. Pin who owns what:

| Writer | Owns |
|---|---|
| Event apply (crew + failures) | discrete conditions, rates, targets |
| Integrator | continuous quantities (kinematics, press, reservoirs, O₂, spool) |
| Systems derivation | auto-reconfiguration flags only (PTU, RAT, bus transfer) |
| FWC reducer | annunciation slice only |
| Displays | nothing (read-only) |

### 2.3 Determinism = fixed step **+** event log

Fixed-step integration makes the *physics* reproducible. An **ordered, timestamped event log** makes the *scenario* reproducible: every crew action and injection is an event, and the store is reconstructable by replaying the log through the integrator. This is command/event-sourcing-lite — adopt it at Stage 2 while it's nearly free. It is also the substrate for scoring (the score is computed against the log) and lets a scenario's "expected crew actions" reuse the **same action vocabulary** as the log.

---

## 3. The two scenario families

| Family | Content is… | Needs | Examples |
|---|---|---|---|
| **Static reconfiguration** | the steady-state consequence | derive once | HYD (GREEN), ELEC bus loss, single F/CTL fault, most single failures |
| **Dynamic / time-evolving** | the trajectory itself | integrator + scenario timeline | **emergency descent**, ENG fire drill (agent timers), progressive fuel leak, smoke/fumes, dual-HYD cascade |

GREEN proved the static family. **Emergency descent is the milestone that proves the dynamic family** — and it needs kinematics only (cabin alt, aircraft alt, IAS/Mach, O₂), never aero.

---

## 4. Roadmap (staged, each independently demoable)

| Stage | Deliverable | Proves / unlocks |
|---|---|---|
| 0 | **This spec** | shared mental model before code |
| 1 ✅ | Static systems engine PoC — **GREEN HYD** | state → derive → render; emergent FWC |
| 2 | **Tick-based store + event log + FWC state slice + scenario skeleton**; finish E/WD (engine row, flaps/slats, fuel, memo, MASTER CAUT/WARN + aural stub, edge-triggered); refactor GREEN onto the shared store | the foundation everything else sits on |
| 3 | **Emergency descent PoC** (first dynamic scenario): pressurisation model, cabin-alt integrator, EXCESS CAB ALT + CRC (single-shot), mask-deploy logic, memory items, mini PFD alt/VS/spd responding to the descent, level-off; **basic guidance layer** (highlight expected actions) | the dynamic family + the public-usability pattern |
| 4 | **PFD** (full) off the store: attitude, spd tape w/ V_MO/M_MO, alt tape, VSI; **FMA drawn, logic stubbed** | the flight-display pattern |
| 5 | **ND** + position + flight plan; drop in **Google Photorealistic 3D Tiles** as terrain | situational realism |
| 6 | **Systems breadth**: ELEC → BLEED/AIR → FUEL → F/CTL + their failures; expand SD pages | covers the canonical ECAM set |
| 7 | **Hard cognitive systems**: autoflight/FMA logic, ADIRS, FMS-lite, full flight-phase inhibits | high-fidelity abnormal behaviour |
| 8 | **Scenario authoring + scoring + instructor tools**; scenario library | a usable trainer, not a demo |

**Known hard parts, de-risked by stubbing first:** the FMA is trivial to *draw* but the autoflight mode logic behind it (arming, engagement, reversions) is genuinely hard — fake it in Stage 4, build it in Stage 7. Same posture for the FMS.

**Guidance layer note:** because the audience is the general public (no FCOM fluency assumed), the optional hint/highlight layer that surfaces a scenario's expected actions is no longer a Stage 8 nicety — a basic version lands in Stage 3. It needs no new architecture; it reads the scenario's expected-action timeline.

---

## 5. Tech stack & key decisions

Locked:
- **Frontend:** React + TypeScript. Displays are components reading a central store.
- **Hosting:** static site (public, free, offline-capable). No backend in scope. *(See decision #1.)*
- **Outside world (Stage 5+):** Google Maps Photorealistic 3D Tiles via deck.gl / 3DTilesRendererJS — fed by a trivial position integrator, no flight model.
- **Reference config:** **FBW A32NX — A320-251N / LEAP-1A / FWC H2F13.** Chosen for documentation quality, not fleet match (public audience). *(See decision #2.)* ⚠️ **Check the FBW licence before porting any code** — it governs derivative terms.

Recommendations:
- **Fixed-timestep integrator with an accumulator, 10 Hz; render via rAF interpolating between the last two sim states.** Deterministic sim *and* smooth PFD tapes without paying a high logic rate. *(See decision #3.)*
- **All derivation / systems / integrator / FWC logic as pure, framework-agnostic TS modules** — no React, no store coupling. Bought for testability and replay first; portability to a server later is a bonus.
- **Zustand** for the store unless you want Redux's devtools/time-travel.

---

## 6. Validation & fidelity discipline

- **FCOM / QRH / OM-B is the spec. You are the oracle.** For a procedural trainer the document gap that hurts a full systems sim mostly disappears — crew-facing behaviour is exactly what the FCOM documents.
- **Tag every unvalidated value in code** with a `// VALIDATE` marker and a source field. Current open items: GREEN LO PR threshold (placeholder 1450 psi), EXCESS CAB ALT trigger (~9,550 ft — confirm), pax mask auto-deploy (~14,000 ft — confirm), exact INOP/STATUS wording, spoiler-by-spoiler hydraulic source.
- **Unit-test the derivation layer** (pure functions → easy) and the **FWC reducer** (feed it state sequences, assert annunciation transitions).
- **Scenario regression tests assert semantic events, not display text** (e.g. `EXCESS_CAB_ALT raised`, not the ECAM string). This decouples scenarios from wording fidelity fixes.

---

## 7. Open decisions — resolved + remaining

1. **Client-only vs server-authoritative → RESOLVED: client-only.** Public/free/offline wants a static URL with zero backend cost and no login. A procedural trainer's value is FCOM-derived knowledge, not a proprietary algorithm — little to protect by server-gating. Keep logic in pure modules (tests/replay), but ship client-side. Revisit only if an instructor/trainee product appears.
2. **Aircraft config → RESOLVED: FBW reference (A320-251N / LEAP-1A / FWC H2F13).** With a public audience the deciding factor is documentation quality, not type-rating match. FBW gives a reference implementation for every ambiguous ECAM behaviour.
3. **Tick rate → RESOLVED: 10 Hz fixed sim, interpolated render.** Don't pick 4 vs 20 — decouple sim from render.
4. **Systems order after HYD → ELEC → BLEED/AIR → FUEL → F/CTL.** ELEC first (everything depends on it; bus-loss reconfig is the richest static family). BLEED/AIR second specifically because Stage 3 already builds the pressurisation kinematics — you extend existing code. Then FUEL, then F/CTL.
5. **Scenario file format → JSON + zod schema.** Authorable and portable; the schema gives authors real validation errors. Scenarios reference failure *kinds* and initial state, and express expected outcomes as **semantic events**, never ECAM display strings.
6. **Scoring → feature at Stage 8, enabler at Stage 2.** The timestamped event log + expected-action timeline are the whole substrate; build them now and Stage 8 is mostly UI.

---

## 8. Usability constraints from "accessible to all"

These don't change the architecture but shape the product:

- **No-manual onboarding.** Visitors won't know CRC, memory items, or ECAM conventions. The guidance layer (expected actions as optional hints/highlights) is essential, not optional — basic version at Stage 3.
- **Disclaimer prominence.** "Not a certified training device" goes where users see it, given a public audience.
- **Mobile/touch consideration (later).** A public web trainer will be opened on phones; the four-display layout needs a responsive/touch-friendly fallback eventually. Out of scope until after Stage 4, but worth not designing yourself into a corner.

---

## Appendix — state shape (sketch, for Stage 2)

```ts
interface AircraftState {
  clock: { t: number; phase: FlightPhase; tickHz: 10 };
  kinematics: {
    altFt: number; vsFpm: number; ias: number; mach: number;
    hdg: number; lat: number; lon: number; pitch: number; bank: number;
  };
  press: { cabinAltFt: number; cabinVsFpm: number; diffPsi: number;
           outflow: number; packFlow: 'LO'|'NORM'|'HI' };
  engines: Array<{ n1: number; n2: number; egt: number; ff: number;
                   tla: number; n1Cmd: number /* spool target */ }>;
  hyd: { green: HydSys; blue: HydSys; yellow: HydSys; ptu: PtuState };  // ✅ Stage 1
  elec: ElecState;   // Stage 6
  fuel: FuelState;   // Stage 6
  bleed: BleedState; // Stage 6
  config: { gear: GearState; flaps: number; slats: number;
            speedbrake: number; masks: boolean; signs: SignsState };
  o2: { crewMin: number; paxMin: number };

  failures: ActiveFailure[];   // discrete bad-condition mutators
  fwc: FwcState;               // NEW: annunciation slice (stateful)
  eventLog: SimEvent[];        // NEW: ordered, timestamped, replayable
}

// The FWC carries its own memory — this is why it can't be a pure function.
interface FwcState {
  active: EcamItem[];          // currently annunciated
  cleared: EcamItem[];         // moved to STATUS after CLR
  confirmTimers: Record<string, number>;  // debounce before annunciation
  auralsPending: AuralId[];    // single-shot, drained by the aural layer
  masterWarn: boolean; masterCaut: boolean;  // latched
  sdPage: SdPageId;            // current auto-called SD page
  inhibits: FlightPhaseInhibit[];
}

interface SimEvent {
  t: number;                   // sim time of application
  kind: 'CREW_ACTION' | 'FAILURE_INJECT';
  action: CrewAction | ActiveFailure;
}
```

Failures carry rates so the integrator can act on them:

```ts
type ActiveFailure =
  | { kind: 'G_HYD_LEAK'; reservoirDrainLpm: number }
  | { kind: 'G_ENG1_PUMP_LOPR' }
  | { kind: 'RAPID_DEPRESS'; cabinClimbFpm: number }
  | { kind: 'ENG_FIRE'; engine: 1 | 2 };
```
