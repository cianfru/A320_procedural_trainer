import { useSimStore } from '../store/useSimStore';
import { DisplayUnit } from './DisplayUnit';
import { EIS } from './glass';

/**
 * Navigation Display — ARC (expanded) mode skeleton: compass arc, aircraft
 * symbol, range rings, heading/track bugs. Position, flight plan and the
 * Photorealistic 3D-tiles terrain layer arrive at Stage 5; this establishes the
 * real ND look and the heading/track references now.
 */
const AC = { x: 256, y: 430 }; // aircraft symbol (bottom-centre)
const R = 326; // compass arc radius
const SPAN = 48; // deg either side of heading drawn on the arc

export function ND() {
  const k = useSimStore((s) => s.state.kinematics);
  const fcu = useSimStore((s) => s.state.fcu);

  const ang = (h: number) => {
    let d = h - k.hdg;
    d = ((d + 540) % 360) - 180;
    return (d - 90) * (Math.PI / 180); // screen angle, heading-up
  };
  const onArc = (h: number, rr: number) => ({
    x: AC.x + rr * Math.cos(ang(h)),
    y: AC.y + rr * Math.sin(ang(h)),
  });

  const ticks: number[] = [];
  const base = Math.round((k.hdg - SPAN) / 5) * 5;
  for (let h = base; h <= k.hdg + SPAN; h += 5) ticks.push(((h % 360) + 360) % 360);

  return (
    <DisplayUnit label="ND">
      {/* mode + range */}
      <text x={12} y={24} fill={EIS.white} fontSize={16}>ARC</text>
      <text x={500} y={24} fill={EIS.cyan} fontSize={16} textAnchor="end">10 NM</text>

      {/* range rings */}
      <circle cx={AC.x} cy={AC.y} r={R / 2} fill="none" stroke={EIS.greyDark} strokeWidth={1} strokeDasharray="3 7" />
      <circle cx={AC.x} cy={AC.y} r={R} fill="none" stroke={EIS.white} strokeWidth={1.5} />

      {/* compass ticks + labels */}
      {ticks.map((h) => {
        const o = onArc(h, R);
        const i = onArc(h, R - (h % 10 === 0 ? 16 : 9));
        return (
          <g key={h}>
            <line x1={o.x} y1={o.y} x2={i.x} y2={i.y} stroke={EIS.white} strokeWidth={1.5} />
            {h % 30 === 0 && (
              <text
                x={onArc(h, R - 34).x}
                y={onArc(h, R - 34).y + 5}
                fill={EIS.white}
                fontSize={15}
                textAnchor="middle"
              >
                {h / 10}
              </text>
            )}
          </g>
        );
      })}

      {/* heading-up lubber line + current heading box */}
      <line x1={AC.x} y1={AC.y - R} x2={AC.x} y2={AC.y - R + 18} stroke={EIS.white} strokeWidth={2} />
      <rect x={AC.x - 30} y={6} width={60} height={26} fill="#000" stroke={EIS.white} strokeWidth={1.5} />
      <text x={AC.x} y={26} fill={EIS.green} fontSize={18} textAnchor="middle">
        {pad(Math.round(k.hdg), 3)}
      </text>

      {/* selected heading bug */}
      <Bug at={onArc(fcu.hdg, R)} color={fcu.hdgManaged ? EIS.magenta : EIS.cyan} />

      {/* aircraft symbol */}
      <g stroke={EIS.amber} strokeWidth={3} fill="none">
        <line x1={AC.x} y1={AC.y - 16} x2={AC.x} y2={AC.y + 14} />
        <line x1={AC.x - 16} y1={AC.y} x2={AC.x + 16} y2={AC.y} />
        <line x1={AC.x - 9} y1={AC.y + 12} x2={AC.x + 9} y2={AC.y + 12} />
      </g>
    </DisplayUnit>
  );
}

function Bug({ at, color }: { at: { x: number; y: number }; color: string }) {
  return <polygon points={`${at.x},${at.y} ${at.x - 8},${at.y - 14} ${at.x + 8},${at.y - 14}`} fill={color} />;
}

const pad = (n: number, w: number) => String(n).padStart(w, '0');
