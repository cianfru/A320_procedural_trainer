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
export const EIS = {
  green: '#0fd80f',
  cyan: '#00e5ff',
  amber: '#ffae00',
  red: '#ff2424',
  magenta: '#ff4fff',
  white: '#ffffff',
  grey: '#9aa3ab',
  greyDark: '#4a525a',
  // PFD attitude sphere
  sky: '#1a7fc4',
  ground: '#8a6726',
  // DU background
  bg: '#000000',
  tape: '#1c1f24',
  tapeEdge: '#3a414a',
} as const;

/** Standard DU drawing surface (square-ish, like a real EIS DU). */
export const DU = { w: 512, h: 512 } as const;

/** Monospace-leaning stack; swap for a licensed/free EIS-like face later. */
export const EIS_FONT =
  "'B612 Mono', 'Roboto Mono', ui-monospace, 'DejaVu Sans Mono', monospace";
