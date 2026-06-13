import { useSimStore } from '../store/useSimStore';
import type { FcuField, FcuButton } from '../sim/types';

/**
 * FCU — the glareshield Flight Control Unit (captain side, left).
 *
 * Shows and sets the selected SPD/HDG/ALT/V-S targets and the AP/ATHR/APPR
 * mode buttons. Every interaction is a crew action through the event log, so
 * the FCU shares the same vocabulary as scenarios/scoring. The autoflight logic
 * that makes these targets fly the aircraft is Stage 7 — for now they display
 * and store (drawn-then-stubbed, spec §4).
 */
export function FCU() {
  const fcu = useSimStore((s) => s.state.fcu);
  const send = useSimStore((s) => s.sendCrewAction);

  const set = (field: FcuField, delta: number) =>
    send({ kind: 'FCU_SET', field, delta });
  const push = (field: FcuField) => send({ kind: 'FCU_PUSH', field });
  const pull = (field: FcuField) => send({ kind: 'FCU_PULL', field });
  const btn = (button: FcuButton) => send({ kind: 'FCU_BUTTON', button });

  return (
    <div className="fcu">
      <div className="fcu-brand">FCU</div>

      <Window
        label={fcu.spdMode}
        value={fcu.spdManaged ? null : Math.round(fcu.spd)}
        field="spd"
        step={1}
        onSet={set}
        onPush={push}
        onPull={pull}
      />
      <Window
        label={fcu.hdgMode}
        value={fcu.hdgManaged ? null : pad(Math.round(fcu.hdg), 3)}
        field="hdg"
        step={1}
        onSet={set}
        onPush={push}
        onPull={pull}
      />
      <Window
        label="ALT"
        value={fcu.altManaged ? null : fcu.alt}
        field="alt"
        step={100}
        onSet={set}
        onPush={push}
        onPull={pull}
      />
      <Window
        label="V/S"
        value={fcu.vsActive ? signed(fcu.vs) : '-----'}
        field="vs"
        step={100}
        onSet={set}
        onPush={push}
        onPull={pull}
      />

      <div className="fcu-buttons">
        <ModeBtn label="LOC" on={fcu.loc} onClick={() => btn('loc')} />
        <ModeBtn label="AP1" on={fcu.ap1} onClick={() => btn('ap1')} />
        <ModeBtn label="AP2" on={fcu.ap2} onClick={() => btn('ap2')} />
        <ModeBtn label="A/THR" on={fcu.athr} onClick={() => btn('athr')} />
        <ModeBtn label="EXPED" on={fcu.exped} onClick={() => btn('exped')} />
        <ModeBtn label="APPR" on={fcu.appr} onClick={() => btn('appr')} />
      </div>
    </div>
  );
}

function Window({
  label,
  value,
  field,
  step,
  onSet,
  onPush,
  onPull,
}: {
  label: string;
  value: number | string | null;
  field: FcuField;
  step: number;
  onSet: (f: FcuField, d: number) => void;
  onPush: (f: FcuField) => void;
  onPull: (f: FcuField) => void;
}) {
  const managed = value === null;
  return (
    <div className="fcu-window">
      <div className="fcu-window-label">{label}</div>
      <div className="fcu-readout">
        {managed ? (
          <span className="fcu-managed-dot" title="managed" />
        ) : (
          <span className="fcu-value">{value}</span>
        )}
      </div>
      <div className="fcu-knob">
        <button onClick={() => onSet(field, -step)} aria-label={`${field} down`}>
          ▼
        </button>
        <div className="fcu-knob-pp">
          <button onClick={() => onPush(field)} title="push = managed">
            PUSH
          </button>
          <button onClick={() => onPull(field)} title="pull = selected">
            PULL
          </button>
        </div>
        <button onClick={() => onSet(field, step)} aria-label={`${field} up`}>
          ▲
        </button>
      </div>
    </div>
  );
}

function ModeBtn({
  label,
  on,
  onClick,
}: {
  label: string;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button className={`fcu-mode ${on ? 'on' : ''}`} onClick={onClick}>
      {label}
    </button>
  );
}

const pad = (n: number, w: number) => String(n).padStart(w, '0');
const signed = (n: number) => (n >= 0 ? `+${n}` : `${n}`);
