import { cn } from '@/lib/utils/cn';

const PALETTE = [
  'bg-[#dbeafe] text-[#1e40af]',
  'bg-[#d1fae5] text-[#065f46]',
  'bg-[#fef3c7] text-[#92400e]',
  'bg-[#ede9fe] text-[#5b21b6]',
  'bg-[#fce7f3] text-[#9d174d]',
  'bg-[#e0f2fe] text-[#075985]',
] as const;

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '?';
  const last = parts.length > 1 ? (parts.at(-1)?.[0] ?? '') : '';
  return `${first}${last}`.toUpperCase();
}

function paletteFor(name: string): string {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return PALETTE[hash % PALETTE.length]!;
}

/** Initials avatar. Decorative: the name is always rendered next to it. */
export function Avatar({
  name,
  size = 'md',
  className,
}: {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold',
        size === 'sm' && 'size-7 text-[0.65rem]',
        size === 'md' && 'size-9 text-xs',
        size === 'lg' && 'size-12 text-sm',
        paletteFor(name),
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
