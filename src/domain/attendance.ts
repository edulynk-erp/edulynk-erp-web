import type { IsoDate, YearScoped } from '@/domain/common';

/** One section's attendance for one school day. */
export interface SectionAttendance extends YearScoped {
  readonly id: string;
  readonly sectionId: string;
  readonly date: IsoDate;
  readonly present: number;
  readonly absent: number;
  readonly late: number;
}
