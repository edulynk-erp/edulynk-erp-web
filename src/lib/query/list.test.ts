import { describe, expect, it } from 'vitest';
import { runListQuery, type ListSpec } from '@/lib/query/list';
import { formatInr, formatInrCompact, formatPercent } from '@/lib/format/number';
import { addDays, daysBetween, formatDate, istDateTime, todayIso } from '@/lib/format/date';

interface Row {
  name: string;
  city: string;
  fee: number | null;
}

const rows: Row[] = [
  { name: 'Aarav Sharma', city: 'Hyderabad', fee: 52000 },
  { name: 'Ishita Rao', city: 'Pune', fee: null },
  { name: 'Ananya Iyer', city: 'Hyderabad', fee: 48000 },
  { name: 'Zoya Khan', city: 'Chennai', fee: 61000 },
];

const spec: ListSpec<Row> = {
  searchText: (row) => `${row.name} ${row.city}`,
  filters: { city: (row, value) => row.city === value },
  sortKeys: { name: (row) => row.name, fee: (row) => row.fee },
};

describe('runListQuery', () => {
  it('searches case- and accent-insensitively and filters', () => {
    expect(runListQuery(rows, { search: 'HYDÉ' }, spec).total).toBe(2);
    expect(runListQuery(rows, { filters: { city: 'Pune' } }, spec).items.map((row) => row.name)).toEqual([
      'Ishita Rao',
    ]);
    expect(runListQuery(rows, { filters: { city: '' } }, spec).total).toBe(4);
  });

  it('sorts with nulls last and paginates with clamping', () => {
    const sorted = runListQuery(rows, { sort: { field: 'fee', direction: 'asc' } }, spec);
    expect(sorted.items.map((row) => row.fee)).toEqual([48000, 52000, 61000, null]);
    const page = runListQuery(rows, { sort: { field: 'name', direction: 'desc' }, page: 9, pageSize: 3 }, spec);
    expect(page).toMatchObject({ page: 2, pageCount: 2, total: 4 });
    expect(page.items.map((row) => row.name)).toEqual(['Aarav Sharma']);
  });
});

describe('formatting', () => {
  it('formats rupees in the Indian numbering system', () => {
    expect(formatInr(1845000)).toBe('₹18,45,000');
    expect(formatInrCompact(1850000)).toBe('₹18.5 L');
    expect(formatInrCompact(32500000)).toBe('₹3.3 Cr');
    expect(formatInrCompact(45000)).toBe('₹45,000');
    expect(formatPercent(92.34)).toBe('92.3%');
  });

  it('handles IST calendar arithmetic', () => {
    expect(todayIso(new Date('2026-10-08T20:00:00Z'))).toBe('2026-10-09');
    expect(addDays('2026-10-09', 30)).toBe('2026-11-08');
    expect(daysBetween('2026-04-01', '2026-10-09')).toBe(191);
    expect(istDateTime('2026-10-09', 10, 30)).toBe('2026-10-09T05:00:00.000Z');
    expect(formatDate('2026-10-09')).toBe('9 Oct 2026');
  });
});
