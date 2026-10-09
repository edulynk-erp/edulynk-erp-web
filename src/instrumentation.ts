/**
 * Fail closed at server start: invalid configuration, or an identity adapter that is not available in this build,
 * stops the process instead of serving requests in a half-configured state.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { assertStartupConfigurationOrExit } = await import('@/server/startup');
  assertStartupConfigurationOrExit();
}
