import { z } from 'zod';

/** Institution white-label branding. Only validated, strictly typed tokens ever reach markup or CSS. */
export interface Branding {
  readonly displayName: string;
  /** `#rrggbb` */
  readonly primaryColor: string;
  /** `#rrggbb`, text on `primaryColor` */
  readonly primaryForeground: string;
}

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export const brandingSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[^<>{}]*$/),
  primaryColor: z.string().regex(HEX_COLOR),
  primaryForeground: z.string().regex(HEX_COLOR),
});

/** Neutral Edulynk branding used until an institution's branding can be resolved from an approved contract. */
export const DEFAULT_BRANDING: Branding = {
  displayName: 'Edulynk',
  primaryColor: '#2f5bd3',
  primaryForeground: '#ffffff',
};

/** Returns validated branding, or the default for anything malformed (fail safe, never partially applied). */
export function parseBranding(input: unknown): Branding {
  const parsed = brandingSchema.safeParse(input);
  return parsed.success ? parsed.data : DEFAULT_BRANDING;
}

/** CSS custom properties for the theme. Values are validated hex colours, so the output cannot break out of the rule. */
export function brandingCss(branding: Branding): string {
  const { primaryColor, primaryForeground } = parseBranding(branding);
  return `:root{--primary:${primaryColor};--ring:${primaryColor};--primary-foreground:${primaryForeground}}`;
}
