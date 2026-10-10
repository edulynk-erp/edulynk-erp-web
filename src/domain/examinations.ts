import type { IsoDate, YearScoped } from '@/domain/common';

export interface Examination extends YearScoped {
  readonly id: string;
  readonly name: string;
  readonly startsOn: IsoDate;
  readonly endsOn: IsoDate;
  readonly status: 'scheduled' | 'in-progress' | 'results-published';
}

/** A section's aggregate result for one examination. */
export interface SectionResult extends YearScoped {
  readonly id: string;
  readonly examinationId: string;
  readonly sectionId: string;
  readonly averagePercent: number;
  readonly passPercent: number;
}
