/**
 * Returns the URL only if it is http(s) (or a root-relative path); anything else (javascript:, data:, vbscript:, …)
 * yields undefined. Use before rendering any server-provided link in an href.
 */
export function safeHref(candidate: unknown): string | undefined {
  if (typeof candidate !== 'string') return undefined;
  const value = candidate.trim();
  if (value === '') return undefined;
  if (value.startsWith('/') && !value.startsWith('//') && !value.includes('\\')) return value;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}
