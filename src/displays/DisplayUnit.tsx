import type { ReactNode } from 'react';
import { DU, EIS_FONT } from './glass';

/**
 * The physical DU frame: a bezel around a black square glass surface with a
 * fixed SVG coordinate space (DU.w × DU.h). Every display renders its symbology
 * as SVG children in that space, so all four units share scale and crispness.
 */
export function DisplayUnit({
  label,
  children,
}: {
  label?: string;
  children: ReactNode;
}) {
  return (
    <div className="du">
      <svg
        className="du-glass"
        viewBox={`0 0 ${DU.w} ${DU.h}`}
        preserveAspectRatio="xMidYMid meet"
        fontFamily={EIS_FONT}
        role="img"
        aria-label={label}
      >
        <rect x={0} y={0} width={DU.w} height={DU.h} fill="#000" />
        {children}
      </svg>
    </div>
  );
}
