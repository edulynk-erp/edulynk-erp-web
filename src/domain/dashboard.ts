import type { AdmissionStage } from '@/domain/admissions';
import type { AuditEvent } from '@/domain/audit';
import type { IsoDate } from '@/domain/common';

/** A figure now and at the end of the previous reporting period, for "vs last month" comparisons. */
export interface PeriodMetric {
  readonly current: number;
  readonly previous: number;
}

export interface GrowthPoint {
  readonly label: string;
  readonly students: number;
}

export type PipelineStage = Exclude<AdmissionStage, 'enrolled'>;

export interface OwnerOverview {
  /** The reporting month the comparisons are made against. */
  readonly period: { readonly from: IsoDate; readonly to: IsoDate };
  readonly students: PeriodMetric;
  readonly staff: PeriodMetric;
  readonly sections: PeriodMetric;
  /** Fees collected in the academic year to date, in rupees. */
  readonly feesCollected: PeriodMetric;
  readonly studentGrowth: {
    readonly thisYear: readonly GrowthPoint[];
    readonly lastYear: readonly GrowthPoint[];
    readonly allYears: readonly GrowthPoint[];
  };
  /** Open and decided applications, excluding those already enrolled as students. */
  readonly admissions: readonly { readonly stage: PipelineStage; readonly count: number }[];
  readonly recentActivity: readonly AuditEvent[];
}
