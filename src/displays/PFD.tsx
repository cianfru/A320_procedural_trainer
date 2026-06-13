import { useSimStore } from '../store/useSimStore';

/**
 * PFD — placeholder mini tape readout for the skeleton. Full attitude / speed
 * tape (V_MO/M_MO) / alt tape / VSI / FMA land in Stage 4. For now it reads the
 * kinematics so the dynamic family (Stage 3 emergency descent) has somewhere to
 * show altitude/VS responding.
 *
 * NOTE: render interpolation between prevState and state (using store `alpha`)
 * is wired in at Stage 4 when the tapes become smooth-scrolling.
 */
export function PFD() {
  const k = useSimStore((s) => s.state.kinematics);
  return (
    <div className="display pfd">
      <div className="display-title">PFD</div>
      <div className="pfd-readout">
        <Field label="IAS" value={Math.round(k.ias)} unit="kt" />
        <Field label="ALT" value={Math.round(k.altFt)} unit="ft" />
        <Field label="V/S" value={Math.round(k.vsFpm)} unit="fpm" />
        <Field label="MACH" value={k.mach.toFixed(2)} unit="" />
        <Field label="HDG" value={Math.round(k.hdg)} unit="°" />
      </div>
      <div className="display-stub">attitude · tapes · FMA → Stage 4</div>
    </div>
  );
}

function Field({
  label,
  value,
  unit,
}: {
  label: string;
  value: number | string;
  unit: string;
}) {
  return (
    <div className="pfd-field">
      <span className="pfd-label">{label}</span>
      <span className="pfd-value">{value}</span>
      <span className="pfd-unit">{unit}</span>
    </div>
  );
}
