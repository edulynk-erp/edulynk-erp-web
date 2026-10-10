import type { IsoDate, IsoDateTime } from '@/domain/common';

/** Institution time zone. Every displayed date is rendered in it so server and browser output agree. */
export const TIME_ZONE = 'Asia/Kolkata';
const LOCALE = 'en-IN';
const DAY_MS = 86_400_000;

/** Calendar date in the institution time zone. */
export function toIsoDate(date: Date): IsoDate {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
  return parts;
}

export function todayIso(now: Date = new Date()): IsoDate {
  return toIsoDate(now);
}

function parse(iso: IsoDate): Date {
  return new Date(`${iso.slice(0, 10)}T00:00:00Z`);
}

export function addDays(iso: IsoDate, days: number): IsoDate {
  return new Date(parse(iso).getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round((parse(to).getTime() - parse(from).getTime()) / DAY_MS);
}

/** 0 = Sunday … 6 = Saturday. */
export function dayOfWeek(iso: IsoDate): number {
  return parse(iso).getUTCDay();
}

/** A timestamp at the given wall-clock time in the institution time zone (IST, UTC+05:30, no DST). */
export function istDateTime(iso: IsoDate, hours: number, minutes = 0): IsoDateTime {
  return new Date(parse(iso).getTime() + (hours * 60 + minutes - 330) * 60_000).toISOString();
}

export function monthKey(iso: IsoDate): string {
  return iso.slice(0, 7);
}

const dateFormat = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
const shortDateFormat = new Intl.DateTimeFormat(LOCALE, { timeZone: TIME_ZONE, day: 'numeric', month: 'short' });
const monthFormat = new Intl.DateTimeFormat(LOCALE, { timeZone: 'UTC', month: 'short' });
const dateTimeFormat = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

/** `9 Oct 2026`. Accepts a date or a timestamp. */
export function formatDate(value: IsoDate | IsoDateTime): string {
  return dateFormat.format(value.length === 10 ? parse(value) : new Date(value));
}

/** `9 Oct`. */
export function formatShortDate(value: IsoDate | IsoDateTime): string {
  return shortDateFormat.format(value.length === 10 ? parse(value) : new Date(value));
}

/** `Oct` for `2026-10`. */
export function formatMonth(key: string): string {
  return monthFormat.format(new Date(`${key}-01T00:00:00Z`));
}

/** `9 Oct 2026, 10:30 am`. */
export function formatDateTime(value: IsoDateTime): string {
  return dateTimeFormat.format(new Date(value));
}

export function formatRelative(value: IsoDateTime, now: Date = new Date()): string {
  const minutes = Math.round((now.getTime() - new Date(value).getTime()) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} d ago`;
  return formatDate(value);
}
