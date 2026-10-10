import type { IsoDate, TenantScoped, YearScoped } from '@/domain/common';

export const STUDENT_STATUSES = ['active', 'inactive', 'transferred', 'alumni'] as const;
export type StudentStatus = (typeof STUDENT_STATUSES)[number];

export interface Student extends YearScoped {
  readonly id: string;
  readonly admissionNo: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly gender: 'female' | 'male';
  readonly dateOfBirth: IsoDate;
  readonly classId: string;
  readonly sectionId: string;
  readonly rollNo: number;
  readonly guardianId: string;
  readonly admittedOn: IsoDate;
  readonly status: StudentStatus;
}

export interface Guardian extends TenantScoped {
  readonly id: string;
  readonly fullName: string;
  readonly relation: 'Father' | 'Mother' | 'Guardian';
  readonly email: string;
  readonly mobile: string;
  readonly occupation: string;
  readonly cityId: string;
}
