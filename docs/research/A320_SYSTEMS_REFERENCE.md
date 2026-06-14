# A320 Systems Reference (A32NX / A320-251N / LEAP-1A)

**Purpose:** ground-truth engineering reference for building a faithful A320
procedural trainer. Values are taken from the **FlyByWire A32NX** open-source
implementation (authoritative for the simulated aircraft) cross-checked against
Airbus FCOM/QRH-derived material. Where the two disagree, both are given and the
deviation is **flagged**.

**Sourcing note:** FlyByWire source on `raw.githubusercontent.com/flybywiresim/aircraft`
was the strongest, byte-verifiable source. Most FCOM mirror sites
(docs.flybywiresim.com HTML, smartcockpit, aviationhunt, theairlinepilots) block
automated fetch (HTTP 403), so their facts come from corroborated search
extracts and should be treated as high-confidence rather than verbatim FCOM.
Compiled 2026-06 via a multi-agent deep-research pass.

> **Confidence key:** `[FBW]` byte-verified in FlyByWire source · `[FCOM]`
> FCOM-derived, corroborated across sources · `[FLAG]` deviation / disagreement.

---

## 1. ECAM / FWC alerting framework

### Alert levels & colours
| Level | Name | Colour | Aural | Master light | Action |
|---|---|---|---|---|---|
| 3 | WARNING | **RED** | CRC (or specific sound/voice) | MASTER WARN (flashing red) | immediate |
| 2 | CAUTION | **AMBER** | Single Chime (SC) | MASTER CAUT (steady amber) | awareness, prompt |
| 1 | ADVISORY | **AMBER** | none | none | monitoring |

ECAM colour code: **red** = immediate action · **amber** = awareness · **green**
= normal/active · **white** = titles/guidance & remarks · **cyan** = crew
actions, limitations, units · **magenta** = special/inhibition messages. `[FCOM]`

### Aural alerts
- **CRC** (continuous repetitive chime) → Level-3 red warnings (e.g. ENG FIRE,
  EXCESS CAB ALT, config). Cancel via MASTER WARN. `[FCOM]`
- **Single Chime** → Level-2 amber cautions. `[FCOM]`
- **Cavalry Charge** → AP disconnect (~1.5 s). `[FCOM]`
- **C-chord** → altitude alert; cancel via MASTER WARN. Alert band commonly
  250–750 ft around selected alt `[FLAG: one source said 200–700 ft]`.
- Specific voice/sounds for some Level-3 (STALL, PRIORITY LEFT/RIGHT, etc.).

### MASTER WARN / MASTER CAUT
Acknowledgement/cancel controls; pressing them silences the aural and clears the
light but does **not** clear the underlying ECAM message (needs CLR once the
condition/procedure is addressed). Some warnings (overspeed, stall) cannot be
silenced this way. Extinguished by the light, CLR, or EMER CANC. `[FBW]` (FBW
warning-panel doc)

### FWC flight phases (10) & inhibits
1 elec pwr→1st eng start · 2 →1st eng TO power · 3 →80 kt · 4 80 kt→liftoff ·
5 liftoff→1500 ft (max 2 min) · 6 1500→800 ft · 7 800 ft→touchdown (max 3 min) ·
8 touchdown→80 kt · 9 80 kt→2nd eng shutdown · 10 →5 min after (then resets). `[FCOM]`
- **T.O INHIBIT**: phases 3,4,5 (1st eng TO power → 1500 ft AGL or 2 min).
- **LDG INHIBIT**: phases 7,8 (800 ft AGL → 80 kt after landing).
- Inhibited messages recoverable with **RCL**.

### ECAM ACTIONS mechanics
- **Sensed** failures auto-detected by the FWC; **non-sensed** procedures are
  crew-requested from a menu.
- Action lines / limitations in **cyan**, guidance in **white**.
- **Underlined title + boxed wording = primary failure**; boxed items = separate
  procedures.
- A completed (sensed) line disappears automatically. **CLR** clears
  underline-to-underline (one procedure incl. its box at a time).
- **RCL** recalls cleared / phase-inhibited messages (hold 3 s to recover
  EMER-CANC'd items). **EMER CANC** silences for the flight, keeps them on STATUS.
- **STATUS (STS)**: left col = limitations/info/cancelled cautions; right col =
  INOP SYS + MAINTENANCE; "NORMAL" if none.
- On a warning/caution the FWC **auto-calls the affected SD page**.

### E/WD layout
Engine gauges (N1, N2, EGT, FF) on top · FOB (kg) · slat/flap indicator · green
**MEMO** · warning/caution stack (lower-left primary, lower-right secondary &
inhibited) · green overflow arrow when text exceeds capacity. `[FBW]`

---

## 2. Displays — palette & symbology

### EIS colour palette (exact FBW hex — use verbatim) `[FBW]`
`MsfsAvionicsCommon/definitions.scss`, `PFD/style.scss`:
| Token | Hex |
|---|---|
| green | `#00ff00` |
| amber | `#e68000` |
| cyan | `#00ffff` |
| magenta | `#ff94ff` |
| red | `#ff0000` |
| yellow | `#ffff00` |
| white | `#ffffff` |
| sky (PFD) | `#0698ff` |
| ground (PFD) | `#9c480c` |
| background | `#040404` |

(ND TCAS-TA amber is a separate `#e38c56`.)

### PFD `[FBW]`
- **Speed tape**: `ValueSpacing 10`, `DistanceSpacing 10`, `DisplayRange 42` kt.
  VLS amber strip, VMAX/VMO/MMO red barber pole (`BarRed`), green dot, F speed,
  S speed (green), alpha-prot (`BarAmber`)/alpha-max (`Fill Red`) in Normal Law,
  selected bug cyan / managed bug magenta, yellow trend arrow (±2 kt hysteresis).
- **Altitude tape**: `ValueSpacing 100` ft, `DistanceSpacing 7.5`, `DisplayRange
  570`. Target bug: cyan (selected) / magenta (managed) / white (ignored: LAND,
  G/S, FINAL). Red rising-ground; metric green→amber below MDA.
- **VSI**: marks 0,1,2,6 (×1000); needle green / amber (excessive) / white (TCAS
  RA); digital hidden < 200 fpm. Amber if |VS|≥6000, or ≤−2000 (RA 1000–2500), or
  ≤−1200 (RA≤1000).
- **Attitude**: sky `#0698ff`, ground `#9c480c`; pitch labels 10/20/30/50/80;
  bank ticks 10/20/30/45/60; yellow reference + FD green.
- **FMA** (active green / armed cyan / new-mode white box 10 s):
  - A/THR: `MAN TOGA`, `MAN FLX`(+temp), `THR CLB`, `THR IDLE`, `SPEED`, `MACH`, `A.FLOOR`, `TOGA LK`
  - Vertical: `SRS`, `CLB`, `OP CLB`, `ALT`, `ALT*`, `ALT CRZ`, `DES`, `OP DES`, `V/S`, `FPA`, `G/S`, `FINAL`, `EXP CLB`, `EXP DES`
  - Lateral: `RWY`, `RWY TRK`, `NAV`, `HDG`, `TRACK`, `LOC *`, `LOC`, `APP NAV`, `LAND`, `FLARE`, `ROLL OUT`, `GA TRK`
  - Capability: `CAT1`, `CAT2`, `CAT3 SINGLE`, `CAT3 DUAL`, `AUTO LAND`
  - AP/FD/ATHR: `AP1`/`AP2`/`AP1+2`, `1 FD 2`, `A/THR`
  - `[FLAG]` FBW shares A380 code → ignore A380-isms (`MAN GA SOFT`, `BRK LO/MED/MAX`, `F-G/S`, `F-LOC`, `RAW ONLY`) for an A320.

### ND `[FBW]`
- Modes: `ROSE_ILS`, `ROSE_VOR`, `ROSE_NAV`, `ARC`, `PLAN`. Ranges **10/20/40/80/160/320 NM**.
- Aircraft symbol yellow. FP waypoints white (`#fff`) / off-route magenta (`#ff94ff`);
  active leg green (`#0f0`); navaids cyan tuned / magenta untuned; constraints
  magenta (met) / amber (missed). Wind arrow green. TCAS: other = white open
  diamond, proximate = white filled, TA = amber circle `#e38c56`, RA = red square.

### SD synoptic pages (display thresholds) `[FBW]`
Pages: ENG, BLEED, PRESS, ELEC AC/DC, HYD, FUEL, APU, COND, DOOR/OXY, WHEEL,
F/CTL, STATUS, CRUISE. Standard: green normal · amber caution/abnormal · red
limit · white labels · cyan units · amber "XX" = data lost.
- **PRESS**: cabin alt green<8800, **pulse 8800–9550, red ≥9550**; cabin V/S
  green ≤1750 pulse >1750; ΔP green −0.4..<8.5, amber outside.
- **ENG**: oil press **red ≤12**, amber >130 / <14 (N2>75%); oil temp amber ≥155
  or <38, pulse ≥140; oil qty low ≤1.35 qt.
- **APU**: N green<102 / amber 102–107 / **red ≥107**; EGT amber band from (max−33).
- **WHEEL**: brake temp **green ≤300, amber >300**; arc green >100.
- **COND**: duct temp **green ≤80 °C, amber >80**.
- `[FLAG]` FBW SD simplifications: BLEED omits precooler temps/pressures & IP/HP
  valves; FUEL renders fuel-temp but no amber threshold; COND has no pack-outlet
  row; DOOR shows no cabin pressure.

---

## 3. HYDRAULICS (ATA 29) `[FBW]`

- Pressures: **nominal 3000 psi**; **LO PR threshold 1450 psi**
  (`MIN_PRESS_PRESSURISED_LO_HYST=1450`, HI hyst 1750). EDP section 1740/2200.
  Priority valve cutoff 1842 / open 2300. Accumulator precharge 1885 psi, 0.264 gal.
- **GREEN**: ENG1 EDP. Reservoir 23 L total / 18 L usable, low-level switch **3 L**.
- **BLUE**: blue **electric pump** (normal) + **RAT** (emergency). 10 L / 8 L,
  low-level **2 L**. (Blue pump section hyst 1450/1750.)
- **YELLOW**: ENG2 EDP + yellow electric pump + hand pump; 20 L / 18 L, low-level
  **3 L**; charges the **brake accumulator** (alternate/parking brake).
- **PTU**: bidirectional GREEN↔YELLOW, engages at ~**500 psi** differential
  (worn model 15% deactivates ~20 psi); barking sound >2400 psi delta.
- **RAT** drives the **BLUE** circuit (→ ~2500 psi → emergency generator). Free-
  stream physics, no fixed deploy-knot constant; deploys on EMER ELEC or RAT pb.
- Circuit consumers: GREEN = normal gear/brakes, L flight controls, slats;
  BLUE = stby flight controls + emer gen; YELLOW = alternate/parking brakes,
  flaps, ENG2 reverser, cargo doors, NWS, PTU source.

**HYD ECAM** `[FCOM wording]`:
| Title | Action lines |
|---|---|
| `HYD G (Y) RSVR LO LVL` | `PTU…OFF`; (Y also `YELLOW ELEC PUMP…OFF`) |
| `HYD B RSVR LO LVL` | `BLUE ELEC PUMP…OFF` |
| `HYD G (B/Y) SYS LO PR` | affected `PUMP…OFF`; STATUS: degraded law/brakes/gear |
| `HYD G+Y SYS LO PR` | `PTU…OFF`, pumps OFF; gravity gear + accu brakes; MAX SPEED 320/.77 |
| `HYD PTU FAULT` | `PTU…OFF` |
| `HYD RAT FAULT` | RAT inop (monitoring) |

---

## 4. ELECTRICAL (ATA 24) `[FBW]`

- **GEN1/GEN2** (IDG): **90 kVA, 115 V, 400 Hz** (band 390–410 Hz). **APU GEN** 90 kVA.
  **EXT PWR** 115 V/400 Hz.
- **TR1/TR2/ESS TR**: 28 V DC (FBW idle 30.2 V `[FLAG]`), ~200 A.
- **BAT1/BAT2**: **23 Ah**, 24/28 V. **Static inverter** 115 V/400 Hz (BAT1→AC ESS
  in emer). **Emergency generator** (RAT→blue): **5 kVA**, needs >10,000 rpm,
  ~8 s spin-up after RAT pressurises blue.
- Buses: AC BUS 1/2, AC ESS (+ ESS SHED), DC BUS 1/2, DC BAT, DC ESS (+ SHED).
  Bus tie cross-feeds when a source is lost.
- **EMER ELEC CONFIG**: triggered by loss of **both AC BUS 1 & 2**. RAT auto-
  deploys. Airspeed logic `[FBW tests]`: **>100 kt** emer gen powers network;
  **50–100 kt or RAT stalled** batteries only; **<50 kt** AC ESS shed. Battery
  endurance ~20–30 min. Galley auto-shed.

**ELEC ECAM** `[FCOM wording]`:
| Title | Action lines |
|---|---|
| `ELEC GEN 1 (2) FAULT` | `GEN 1(2)…OFF then ON`; if unsuccessful `GEN 1(2)…OFF` |
| `ELEC GEN 1 (2) LINE OFF` | advisory (GEN healthy, line open) |
| `ELEC AC BUS 1 (2) FAULT` | STATUS inop list; bus-tie auto-feeds |
| `ELEC AC ESS BUS FAULT` | `AC ESS FEED…ALTN` |
| `ELEC DC BUS 1 (2) FAULT` | STATUS; DC tie cross-feed |
| `ELEC TR 1 (2) FAULT` | STATUS; other TR via DC tie |
| `ELEC BAT 1 (2) FAULT` | `BAT 1(2)…OFF` |
| `ELEC EMER CONFIG` | `EMER ELEC PWR…MAN ON`, `GEN 1+2…OFF then ON`, maintain ~140 kt |

---

## 5. BLEED / AIR / PRESSURISATION (ATA 21/36) `[FBW]`

- Bleed: ENG IP/HP bleed (HP opens at low power), APU bleed, X-BLEED valve (AUTO
  opens with APU bleed). Engine bleed "on" when N1 > 10%. Two PACKs; flow LO≈80% /
  NORM=100% / HI≈120% (auto HI single-pack or APU bleed). Mixer + trim air, ACSC.
- Pressurisation: **CPC 1/2** (1 active, auto-switch), 1 outflow valve + 1 safety
  valve. Constants:
  - `MAX_CLIMB_DELTA_P = 8.06 psi`, `MAX_SAFETY_DELTA_P = 8.1`, `MIN_SAFETY_DELTA_P
    = −0.5`, `MAX_TAKEOFF_DELTA_P = 0.1`, `MAX_CLIMB_CABIN_ALTITUDE = 8050 ft`.
  - `[FLAG]` FCOM commonly cites max ΔP ~8.6 psi / −1.0; FBW uses 8.06/8.1/−0.5.
  - Cabin V/S: `MAX_CLIMB_RATE 750`, `MAX_DESCENT_RATE −750`, `DEPRESS_RATE 500` fpm.
  - Pressurised volume: cabin 139 m³, cockpit 9 m³, total 330 m³.
- **CRITICAL TRIGGERS:**
  - **EXCESS CAB ALT warning: cabin alt > 9,550 ft** (`EXCESSIVE_ALT_WARNING=9550`). `[FBW]`
  - **PAX O2 masks auto-deploy: cabin alt > 14,000 ft** (16,000 ft if HI ALT LDG). `[FCOM]`
  - **LO DIFF PR caution: 1.45 psi** (`LOW_DIFFERENTIAL_PRESSURE_WARNING=1.45`). `[FBW]`
  - Excess residual ground ΔP warning: 0.036 psi. `[FBW]`

**BLEED/PRESS/COND ECAM (verbatim from FBW `EwdMessages.ts`)** `[FBW]`:
```
CAB PR EXCESS CAB ALT          AIR PACK 1 (2) FAULT
 -CREW OXY MASKS.....USE        -PACK 1 (2)..........OFF
 -SIGNS...............ON
 .EMER DESCENT:                AIR PACK 1+2 FAULT
 -DESCENT.......INITIATE        -PACK 1.............OFF
 -THR LEVERS........IDLE        -PACK 2.............OFF
 -SPD BRK...........FULL        -DES TO FL 100/MEA-MORA
  SPD.....MAX/APPROPRIATE       .WHEN DIFF PR <1 PSI AND FL<100:
 -ENG MODE SEL.......IGN        -RAM AIR.............ON
 -ATC.............NOTIFY
 -CABIN CREW......ADVISE       CAB PR SYS 1+2 FAULT
 -EMER DES (PA).ANNOUNCE        -MODE SEL...........MAN
 -XPDR 7700.....CONSIDER        -MAN V/S CTL....AS RQRD
  MAX FL.....100/MEA-MORA
 .IF CAB ALT>14000FT:          CAB PR LO DIFF PR
 -PAX OXY MASKS...MAN ON         -EXPECT HI CAB RATE
                                -A/C V/S.........REDUCE
CAB PR SAFETY VALVE OPEN
 .IF DIFF PR ABV 8 PSI:        COND CKPT (FWD/AFT) DUCT OVHT
 -MODE SEL...........MAN         .WHEN DUCT TEMP<70 DEG C:
 -MAN V/S CTL....AS RQRD        -HOT AIR....OFF THEN ON
```
- `[FLAG]` `AIR ENG 1(2) BLEED FAULT` / `AIR X BLEED FAULT` strings not in the
  A32NX air-cond EWD group; confirm via A380X FWS / legacy FWC when implementing.

---

## 6. EMERGENCY DESCENT (dynamic scenario)

Driven by `CAB PR EXCESS CAB ALT` (cabin alt >9,550 ft). Memory/ordered actions:
CREW OXY MASKS·USE → SIGNS·ON → announce → DESCENT·INITIATE → THR·IDLE →
SPD BRK·FULL → SPD MAX/appropriate (≈M.82/350 kt; M.82/300 kt if structural
damage) → ENG MODE·IGN → ATC·NOTIFY → CABIN CREW·ADVISE → EMER DES PA → XPDR 7700
→ level off **MAX FL 100/MEA-MORA** → IF CAB ALT>14000FT: PAX OXY MASKS·MAN ON.
Dynamics: ≈**7,000 fpm** with idle+full speedbrake; FL390→FL100 ≈ 4 min / 40 NM;
below FL100 limit ROD ~1,000 fpm. `[FBW EwdMessages + FCOM]`

---

## 7. FUEL (ATA 28)

- Tanks: 2 outer (1408 kg), 2 inner (11,079 kg), 1 center (6,600 kg). Wing pumps
  2/side; **center uses jet pumps** (NEO) fed by wing-pump motive flow. `[FBW/FCOM]`
- Transfer (AUTO): valves open when inner 500 kg below full; close 5 min after
  center reaches 130 kg low level. Outer→inner transfer at inner 750 kg.
- **MODE SEL FAULT**: wing tank <5000 kg AND center >250 kg (AUTO). `[FBW]`
- **LO LVL trigger: inner < 750 kg.** `[FBW]`

**FUEL ECAM (verbatim FBW)** — only WING TK LO LVL implemented `[FBW]`:
```
L+R WING TK LO LVL          L (R) WING TK LO LVL
 -FUEL MODE SEL......MAN      -FUEL MODE SEL......MAN
 -L TK PUMP 1.........ON       .IF NO FUEL LEAK AND IMBALANCE:
 -L TK PUMP 2.........ON      -FUEL X FEED.........ON
 -CTR TK L XFR........ON      -L(R) TK PUMP 1.....OFF
 ...(R side + CTR symmetric)  -L(R) TK PUMP 2.....OFF
 .IF NO FUEL LEAK: X FEED ON
 .IF GRVTY FEED: X FEED OFF
```
- `[FLAG]` `FUEL L(R) TK PUMP LO PR`, `F.USED/FOB DISAGREE`, `OUTER/INNER TK HI
  TEMP` (outer >60/55, inner >54/45 °C), `FUEL LEAK` are **not** in FBW FWC; use
  FCOM if implementing. HI TEMP real titles are `… OUTER/INNER TK HI TEMP`.

---

## 8. FLIGHT CONTROLS (ATA 27)

- Computers: **2 ELAC, 3 SEC, 2 FAC**. ELAC1→ailerons, ELAC2→elevators+THS; SEC1/2
  spoilers+backup pitch, SEC3 spoilers only (no pitch). Spoilers: SEC3→1+2,
  SEC1→3+4, SEC2→5. Roll=2–5, speedbrake=2–4, ground spoiler=all. FAC1/2→rudder
  (yaw damper, trim, travel limit), envelope/VLS/VMAX, windshear. `[FBW]`
- **Laws**: NORMAL (full protection: +2.5/−1.0 g clean, +2.0/0 flaps; pitch 30°
  up CONF0-3 / 25° FULL, 15° down; bank 67° max, return >33°; alpha & high-speed
  protections) → ALTERNATE (load factor kept; roll direct; lost alpha/bank/HS
  protection, replaced by stability; "PROT LOST" variant loses stability too) →
  DIRECT (manual pitch trim; auto on gear-down in ALTN) → MECHANICAL (THS wheel +
  rudder). `[FBW]`
- Flaps/slats (2 SFCC): CONF 1=18/0, 1+F=18/10, 2=22/15, 3=22/20, FULL=27/**40**
  (`[FLAG]` FCOM cites 35° for some CFM). VFE 230/215/200/185/177. 1+F→1 auto at 210 kt.

**F/CTL ECAM (verbatim FBW `EwdMessages.ts`)** `[FBW]`:
```
ELAC 1 (2) FAULT            SEC 1 (2/3) FAULT          ALTN LAW (PROT LOST)
 -ELAC 1...OFF THEN ON       -SEC 1...OFF THEN ON       MAX SPEED......320 KT
  .IF UNSUCCESSFUL:          .IF UNSUCCESSFUL:          MAX SPEED.....320/.77
 -ELAC 1...........OFF       -SEC 1............OFF       MANEUVER WITH CARE
 FUEL CONSUMPT INCRSD        SPD BRK...DO NOT USE        MAX FL...........350
 FMS PRED UNRELIABLE         (SPD BRK line SEC 1 only)   SPD BRK...DO NOT USE

DIRECT LAW                  SPD BRK DISAGREE           FAC 1 (2) FAULT  [grouped AUTO FLT]
 (PROT LOST)                 -SPD BRK LEVER..RETRACT     -FAC 1...OFF THEN ON
 MAX SPEED.....320/.77       SPD BRK...DO NOT USE
 -MAN PITCH TRIM....USE
 MAX FL...........350
```
- `[FLAG]` FAC FAULT is grouped under **AUTO FLT** (ATA 22), not F/CTL.
  `F/CTL FLAPS/SLATS FAULT` **not** in FBW (only `…NOT IN T.O CONFIG`).

---

## 9. ENGINES (ATA 70-80) — LEAP-1A26 `[FBW + FCOM]`

- N1-rated. Params N1/N2/EGT/FF (+ oil qty/press/temp, vibration). "Starting"
  while N2 < 58.5%.
- **Limits (LEAP-1A — do NOT use CFM56 values):** EGT **TO/GA 1060 °C** (redline),
  **MCT 1025 °C**, start ground **750 °C** / in-flight **875 °C**. **N1 max 101%**,
  **N2 max 116.5%**. Oil press red **≤12**, amber <14 (N2>75%) / >130 (FBW
  `OIL_PSI` 12/14/130). Oil temp **38 / 140 / 155 °C** (low-TO / hi-advisory /
  red); transient 165 °C. Oil qty max 24.25 qt, low 1.35.
- FADEC (dual-channel EEC per engine) + EIU (airframe↔FADEC interface, feeds FWC).
- `[FLAG]` Only **ENG FIRE** + **DUAL ENGINE FAILURE** modelled in FBW FWC; per-engine
  OIL/STALL/EGT-OVER/N1-N2-OVER/REVERSER ECAMs are FCOM-only (not yet in FBW).

**ENG 1 (2) FIRE (verbatim FBW)** `[FBW]`:
```
ENG 1 FIRE
 -THR LEVER 1.......IDLE        (in flight)
 -THR LEVERS........IDLE        (on ground)
 .WHEN A/C IS STOPPED: PARKING BRK ON · ATC NOTIFY · CABIN CREW ALERT
 -ENG MASTER 1.......OFF
 -ENG 1 FIRE P/B....PUSH
 -AGENT1 AFTER 10S.DISCH        ← AGENT 1 discharge timer = 10 s
 -AGENT 1..........DISCH
 .IF FIRE AFTER 30S: -AGENT 2..DISCH   ← AGENT 2 timer = 30 s
 -EMER EVAC PROC...APPLY
```
Fire-bottle timers confirmed in `PseudoFWC.ts`: `NXLogicClockNode(10,0)` & `(30,0)`.

---

## 10. APU (ATA 49) & FIRE (ATA 26)

**APU** `[FBW]`: MASTER SW ON → flap+fuel valve open + self-test; START → starter at
flap-open, ignition +1.5 s, starter off at 55% N; AVAIL when N>99.5% or N>95% for
2 s. Shutdown cooldown if bleed used (**docs 60 s / source 120 s** `[FLAG]`). APU
GEN 90 kVA (powered at 84% N). EGT: running max **675–682 °C** `[FLAG between
sources]`, start max ~900/982 °C (alt-dependent) or FCOM 1090/1120; amber at
max−33, red at max → auto-shutdown; overspeed shutdown ~107% N.

**FIRE** `[FBW/FCOM]`: engine dual loop A+B per FDU; warning if both loops, or one
loop + other failed, or both fail within 5 s, or TEST. ENG FIRE P/B (release):
silences aural, arms squibs, closes LP fuel / hyd fire shutoff / bleed / pack
valves, cuts FADEC power, deactivates IDG. Bottles: **2 per engine (AGENT 1+2),
1 APU, 1 shared cargo**. APU fire on ground → auto shutdown + auto agent
discharge; in flight manual. `[FLAG]` cargo smoke detection currently **INOP in
FBW**. SQUIB white = armed, DISCH amber = bottle fired (cargo ~60 s).
```
APU FIRE: -APU FIRE P/B..PUSH  -APU AGENT..DISCH  -APU MASTER SW..OFF
SMOKE FWD/AFT CARGO: -FWD/BULK ISOL VALVES..OFF  -AGENT TO FWD/AFT..DISCH
```

---

## 11. Consolidated ECAM catalogue (implementation index)

| id (semantic) | title | level | aural | SD page | source |
|---|---|---|---|---|---|
| HYD_G_SYS_LO_PR | HYD G SYS LO PR | CAUT | SC | HYD | FCOM |
| HYD_B_SYS_LO_PR | HYD B SYS LO PR | CAUT | SC | HYD | FCOM |
| HYD_Y_SYS_LO_PR | HYD Y SYS LO PR | CAUT | SC | HYD | FCOM |
| HYD_G/B/Y_RSVR_LO_LVL | HYD x RSVR LO LVL | CAUT | SC | HYD | FCOM |
| HYD_PTU_FAULT | HYD PTU FAULT | CAUT | SC | HYD | FBW |
| ELEC_GEN_1/2_FAULT | ELEC GEN 1(2) FAULT | CAUT | SC | ELEC | FCOM |
| ELEC_AC_BUS_1/2_FAULT | ELEC AC BUS 1(2) FAULT | CAUT | SC | ELEC | FCOM |
| ELEC_TR_1/2_FAULT | ELEC TR 1(2) FAULT | CAUT | SC | ELEC | FCOM |
| ELEC_AC_ESS_BUS_FAULT | ELEC AC ESS BUS FAULT | CAUT | SC | ELEC | FCOM |
| ELEC_BAT_1/2_FAULT | ELEC BAT 1(2) FAULT | CAUT | SC | ELEC | FCOM |
| ELEC_EMER_CONFIG | ELEC EMER CONFIG | WARN | CRC | ELEC | FCOM |
| CAB_PR_EXCESS_CAB_ALT | CAB PR EXCESS CAB ALT | WARN | CRC | PRESS | FBW |
| CAB_PR_SYS_1+2_FAULT | CAB PR SYS 1+2 FAULT | CAUT | SC | PRESS | FBW |
| CAB_PR_LO_DIFF_PR | CAB PR LO DIFF PR | CAUT | SC | PRESS | FBW |
| AIR_PACK_1/2_FAULT | AIR PACK 1(2) FAULT | CAUT | SC | BLEED | FBW |
| FUEL_L/R/L+R_WING_TK_LO_LVL | … WING TK LO LVL | CAUT | SC | FUEL | FBW |
| FCTL_ELAC_1/2_FAULT | ELAC 1(2) FAULT | CAUT | SC | F/CTL | FBW |
| FCTL_SEC_1/2/3_FAULT | SEC 1(2/3) FAULT | CAUT | SC | F/CTL | FBW |
| FCTL_ALTN_LAW | ALTN LAW (PROT LOST) | CAUT | SC | F/CTL | FBW |
| FCTL_DIRECT_LAW | DIRECT LAW (PROT LOST) | CAUT | SC | F/CTL | FBW |
| AUTOFLT_FAC_1/2_FAULT | FAC 1(2) FAULT | CAUT | SC | F/CTL | FBW |
| ENG_1/2_FIRE | ENG 1(2) FIRE | WARN | CRC | ENG | FBW |
| ENG_DUAL_FAILURE | DUAL ENGINE FAILURE | WARN | CRC | ENG | FBW |
| ENG_1/2_OIL_LO_PR | ENG 1(2) OIL LO PR | CAUT | SC | ENG | FCOM |
| ENG_1/2_STALL | ENG 1(2) STALL | CAUT | SC | ENG | FCOM |
| APU_FIRE | APU FIRE | WARN | CRC | APU | FBW |
| APU_AUTO_SHUT_DOWN | APU AUTO SHUT DOWN | CAUT | SC | APU | FCOM |
| SMOKE_FWD/AFT_CARGO | … CARGO SMOKE | WARN | CRC | — | FBW |

(Flight-phase inhibits per §1; most fuel LO LVL inhibited in phases 3,4,5,7,8,9.)

---

## 12. Key deviations to remember (FBW vs real FCOM)
1. Pressurisation ΔP: FBW 8.06/8.1/−0.5 psi vs FCOM ~8.6/−1.0.
2. Cabin V/S capped ±750 fpm (FBW) vs ~+1000/−750 (FCOM).
3. EMER DESCENT speed: FBW "MAX/APPROPRIATE" vs FCOM "MAX/MMO/VMO" (~M.82/350).
4. CONF FULL flaps 40° (FBW docs) vs 35° (some FCOM).
5. FBW not-yet-modelled: per-engine OIL/STALL/EGT/REVERSER ECAM, FUEL PUMP LO PR /
   F.USED-FOB DISAGREE / HI TEMP / LEAK, F/CTL FLAPS/SLATS FAULT, cargo smoke detection.
6. TR idle 30.2 V (FBW) vs 28 V nominal; IDG labelled 90 kW vs 90 kVA.
7. APU running EGT 675 vs 682 °C; APU cooldown 60 vs 120 s.
8. Use **LEAP-1A** engine limits, never CFM56-5B.

## 13. Primary sources
- FlyByWire source: `github.com/flybywiresim/aircraft` — `fbw-a32nx/src/wasm/systems/a320_systems/src/{hydraulic,electrical,air_conditioning}`, `…/systems/shared/src/EwdMessages.ts`, `…/systems-host/systems/FWC/PseudoFWC.ts`, `…/instruments/src/{PFD,ND,SD}`, `MsfsAvionicsCommon/definitions.scss`.
- FCOM-derived corroboration: aviationhunt.com, smartcockpit.com, pprune.org, theairlinepilots.com, docs.flybywiresim.com.
