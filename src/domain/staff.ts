import type { CampusScoped, IsoDate } from '@/domain/common';

export interface StaffMember extends CampusScoped {
  readonly id: string;
  readonly employeeId: string;
  readonly fullName: string;
  readonly departmentId: string;
  /** From the designations catalog (`config/designations`). */
  readonly designationId: string;
  readonly category: 'teaching' | 'non-teaching';
  readonly joinedOn: IsoDate;
  readonly status: 'active' | 'on-leave' | 'exited';
}

export interface LeaveRequest extends CampusScoped {
  readonly id: string;
  readonly staffId: string;
  readonly type: 'Casual' | 'Sick' | 'Earned';
  readonly from: IsoDate;
  readonly to: IsoDate;
  readonly status: 'pending' | 'approved' | 'rejected';
}
