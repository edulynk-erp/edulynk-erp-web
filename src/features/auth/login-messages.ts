export interface LoginNotice {
  readonly tone: 'info' | 'error';
  readonly message: string;
}

const REASONS: Record<string, LoginNotice> = {
  session_expired: { tone: 'info', message: 'Your session has expired. Sign in again to continue.' },
  signed_out: { tone: 'info', message: 'You have been signed out.' },
};

const ERRORS: Record<string, LoginNotice> = {
  unavailable: { tone: 'error', message: 'Sign-in is not available in this environment.' },
  rejected: { tone: 'error', message: 'Sign-in was not accepted. Try again.' },
  request: { tone: 'error', message: 'The sign-in request could not be verified. Try again.' },
  session: { tone: 'error', message: 'Your session could not be created. Contact an administrator.' },
};

/** Maps query codes to fixed copy; arbitrary query text is never rendered. */
export function loginNotice(reason: string | undefined, error: string | undefined): LoginNotice | undefined {
  if (error && Object.hasOwn(ERRORS, error)) return ERRORS[error];
  if (reason && Object.hasOwn(REASONS, reason)) return REASONS[reason];
  return undefined;
}
