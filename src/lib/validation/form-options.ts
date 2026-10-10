/**
 * Shared react-hook-form options: a field is validated as soon as it changes or loses focus, and its message updates
 * on every keystroke, so errors appear and clear while the user types.
 */
export const LIVE_VALIDATION = { mode: 'all', reValidateMode: 'onChange' } as const;
