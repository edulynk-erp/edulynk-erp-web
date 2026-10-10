const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const count = new Intl.NumberFormat('en-IN');
const oneDecimal = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 });

/** `₹18,45,000` (Indian digit grouping). */
export function formatInr(amount: number): string {
  return inr.format(Math.round(amount));
}

/** `₹18.5 L`, `₹1.2 Cr`, `₹45,000`: lakh and crore, as Indian finance teams read them. */
export function formatInrCompact(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1e7) return `₹${oneDecimal.format(amount / 1e7)} Cr`;
  if (abs >= 1e5) return `₹${oneDecimal.format(amount / 1e5)} L`;
  return formatInr(amount);
}

/** `2,450`. */
export function formatCount(value: number): string {
  return count.format(value);
}

/** `94.6%`. */
export function formatPercent(value: number): string {
  return `${oneDecimal.format(value)}%`;
}

export function percent(part: number, whole: number): number {
  return whole === 0 ? 0 : (part / whole) * 100;
}
