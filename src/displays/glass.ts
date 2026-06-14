/**
 * Shared "glass cockpit" foundation for all four display units.
 *
 * Airbus EIS colour semantics (the convention every DU obeys):
 *   green   — normal operation / current value
 *   cyan    — crew-selectable values, units, limits
 *   amber   — caution
 *   red     — warning
 *   magenta — managed targets / selected bugs / capture pointers
 *   white   — scales, current scale markings, titles
 *   grey    — inactive / background structure
 *
 * VALIDATE: exact hues are tuned to look right on screen; refine against
 * flight-deck mockups (clean-room: match appearance, don't copy assets).
 */
// Exact FlyByWire A32NX EIS hex values (definitions.scss / PFD style.scss) —
// see docs/research/A320_SYSTEMS_REFERENCE.md §2.
export const EIS = {
  green: '#00ff00',
  cyan: '#00ffff',
  amber: '#e68000',
  red: '#ff0000',
  magenta: '#ff94ff',
  white: '#ffffff',
  yellow: '#ffff00', // aircraft reference / trend / slip
  grey: '#9aa3ab',
  greyDark: '#4a525a',
  // PFD attitude sphere
  sky: '#0698ff',
  ground: '#9c480c',
  // DU background
  bg: '#040404',
  tape: '#1c1f24',
  tapeEdge: '#3a414a',
} as const;

/** Standard DU drawing surface (square-ish, like a real EIS DU). */
export const DU = { w: 512, h: 512 } as const;

/** Monospace-leaning stack; swap for a licensed/free EIS-like face later. */
export const EIS_FONT =
  "'B612 Mono', 'Roboto Mono', ui-monospace, 'DejaVu Sans Mono', monospace";
