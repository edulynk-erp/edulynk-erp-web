import type { IsoDate, YearScoped } from '@/domain/common';

export const ADMISSION_STAGES = ['enquiry', 'in-review', 'accepted', 'enrolled', 'rejected'] as const;
export type AdmissionStage = (typeof ADMISSION_STAGES)[number];

export interface AdmissionApplication extends YearScoped {
  readonly id: string;
  readonly applicationNo: string;
  readonly applicantName: string;
  readonly guardianName: string;
  readonly guardianMobile: string;
  readonly classLevel: number;
  readonly source: 'Walk-in' | 'Website' | 'Referral' | 'Campaign';
  readonly stage: AdmissionStage;
  readonly createdOn: IsoDate;
  readonly updatedOn: IsoDate;
}
