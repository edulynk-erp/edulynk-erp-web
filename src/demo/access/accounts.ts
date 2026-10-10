import type { CampusScope } from '@/domain/common';

/**
 * DEMO FIXTURE. One account per demo role, so every role can be signed in to and switched to. The same people exist as
 * users (and, except the auditor, staff) in the seed data. Every relation is an explicit ID; nothing is matched by name.
 * The shared demo password lives only in the server-side demo identity adapter.
 */
export interface DemoAccount {
  /** Unique user ID. Also the session subject. */
  readonly userId: string;
  /** The staff record for this person, or null when they are not on the staff roll (the external auditor). */
  readonly staffId: string | null;
  readonly employeeId: string | null;
  readonly roleId: string;
  readonly fullName: string;
  readonly email: string;
  readonly mobile: string;
  readonly designationId: string;
  readonly departmentId: string | null;
  readonly campusId: string;
}

export const DEMO_TENANT_ID = 'tnt_greenwood_hyd';
export const DEMO_EMAIL_DOMAIN = 'greenwood.edu.in';

export const MAIN_CAMPUS_ID = 'cmp_main';
export const CITY_CAMPUS_ID = 'cmp_city';

/** Account user IDs, for seed data that refers to a specific person. */
export const ACCOUNT_IDS = {
  owner: 'usr_0001',
  admin: 'usr_0002',
  principal: 'usr_0003',
  vicePrincipal: 'usr_0004',
  academicCoordinator: 'usr_0005',
  teacher: 'usr_0006',
  admissionsOfficer: 'usr_0007',
  accountant: 'usr_0008',
  hrAdmin: 'usr_0009',
  librarian: 'usr_0010',
  transportHostel: 'usr_0011',
  auditor: 'usr_0012',
} as const;

export const DEMO_ACCOUNTS: readonly DemoAccount[] = [
  {
    userId: ACCOUNT_IDS.owner,
    staffId: 'stf_0001',
    employeeId: 'GIS-N-1001',
    roleId: 'owner',
    fullName: 'Ramesh Kumar',
    email: `ramesh.kumar@${DEMO_EMAIL_DOMAIN}`,
    mobile: '+91 98450 12345',
    designationId: 'dsg_chairman_owner',
    departmentId: 'dep_administration',
    campusId: MAIN_CAMPUS_ID,
  },
  {
    userId: ACCOUNT_IDS.admin,
    staffId: 'stf_0002',
    employeeId: 'GIS-N-1002',
    roleId: 'admin',
    fullName: 'Anil Mehta',
    email: `anil.mehta@${DEMO_EMAIL_DOMAIN}`,
    mobile: '+91 98451 22310',
    designationId: 'dsg_administrative_officer',
    departmentId: 'dep_administration',
    campusId: MAIN_CAMPUS_ID,
  },
  {
    userId: ACCOUNT_IDS.principal,
    staffId: 'stf_0003',
    employeeId: 'GIS-T-1003',
    roleId: 'principal',
    fullName: 'Meena Reddy',
    email: `meena.reddy@${DEMO_EMAIL_DOMAIN}`,
    mobile: '+91 98452 33421',
    designationId: 'dsg_principal',
    departmentId: 'dep_administration',
    campusId: MAIN_CAMPUS_ID,
  },
  {
    userId: ACCOUNT_IDS.vicePrincipal,
    staffId: 'stf_0004',
    employeeId: 'GIS-T-1004',
    roleId: 'vice-principal',
    fullName: 'Suresh Verma',
    email: `suresh.verma@${DEMO_EMAIL_DOMAIN}`,
    mobile: '+91 98453 44532',
    designationId: 'dsg_vice_principal',
    departmentId: 'dep_administration',
    campusId: MAIN_CAMPUS_ID,
  },
  {
    userId: ACCOUNT_IDS.academicCoordinator,
    staffId: 'stf_0005',
    employeeId: 'GIS-T-1005',
    roleId: 'academic-coordinator',
    fullName: 'Kavitha Nair',
    email: `kavitha.nair@${DEMO_EMAIL_DOMAIN}`,
    mobile: '+91 98454 55643',
    designationId: 'dsg_academic_coordinator',
    departmentId: 'dep_academics_secondary',
    campusId: MAIN_CAMPUS_ID,
  },
  {
    userId: ACCOUNT_IDS.teacher,
    staffId: 'stf_0006',
    employeeId: 'GIS-T-1006',
    roleId: 'teacher',
    fullName: 'Rahul Mehra',
    email: `rahul.mehra@${DEMO_EMAIL_DOMAIN}`,
    mobile: '+91 98455 66754',
    designationId: 'dsg_tgt_mathematics',
    departmentId: 'dep_mathematics',
    campusId: MAIN_CAMPUS_ID,
  },
  {
    userId: ACCOUNT_IDS.admissionsOfficer,
    staffId: 'stf_0007',
    employeeId: 'GIS-N-1007',
    roleId: 'admissions-officer',
    fullName: 'Priya Sharma',
    email: `priya.sharma@${DEMO_EMAIL_DOMAIN}`,
    mobile: '+91 98456 77865',
    designationId: 'dsg_admissions_officer',
    departmentId: 'dep_admissions',
    campusId: MAIN_CAMPUS_ID,
  },
  {
    userId: ACCOUNT_IDS.accountant,
    staffId: 'stf_0008',
    employeeId: 'GIS-N-1008',
    roleId: 'accountant',
    fullName: 'Kiran Das',
    email: `kiran.das@${DEMO_EMAIL_DOMAIN}`,
    mobile: '+91 98457 88976',
    designationId: 'dsg_senior_accountant',
    departmentId: 'dep_finance',
    campusId: MAIN_CAMPUS_ID,
  },
  {
    userId: ACCOUNT_IDS.hrAdmin,
    staffId: 'stf_0009',
    employeeId: 'GIS-N-1009',
    roleId: 'hr-admin',
    fullName: 'Anita Patel',
    email: `anita.patel@${DEMO_EMAIL_DOMAIN}`,
    mobile: '+91 98458 99087',
    designationId: 'dsg_hr_manager',
    departmentId: 'dep_hr',
    campusId: MAIN_CAMPUS_ID,
  },
  {
    userId: ACCOUNT_IDS.librarian,
    staffId: 'stf_0010',
    employeeId: 'GIS-N-1010',
    roleId: 'librarian',
    fullName: 'Lakshmi Iyer',
    email: `lakshmi.iyer@${DEMO_EMAIL_DOMAIN}`,
    mobile: '+91 98459 10198',
    designationId: 'dsg_librarian',
    departmentId: 'dep_library',
    campusId: MAIN_CAMPUS_ID,
  },
  {
    userId: ACCOUNT_IDS.transportHostel,
    staffId: 'stf_0011',
    employeeId: 'GIS-N-1011',
    roleId: 'transport-hostel',
    fullName: 'Mohammed Irfan',
    email: `mohammed.irfan@${DEMO_EMAIL_DOMAIN}`,
    mobile: '+91 98460 21209',
    designationId: 'dsg_transport_supervisor',
    departmentId: 'dep_transport',
    campusId: CITY_CAMPUS_ID,
  },
  {
    userId: ACCOUNT_IDS.auditor,
    staffId: null,
    employeeId: null,
    roleId: 'auditor',
    fullName: 'Deepak Joshi',
    email: `deepak.joshi@${DEMO_EMAIL_DOMAIN}`,
    mobile: '+91 98463 54532',
    designationId: 'dsg_internal_auditor',
    departmentId: 'dep_finance',
    campusId: MAIN_CAMPUS_ID,
  },
];

export function findAccount(userId: string): DemoAccount {
  const account = DEMO_ACCOUNTS.find((candidate) => candidate.userId === userId);
  if (!account) throw new Error(`Unknown demo account ${userId}`);
  return account;
}

export const OWNER_ACCOUNT = findAccount(ACCOUNT_IDS.owner);

/** Roles that work across the whole institution. Everyone else is limited to the campus they are posted to. */
const INSTITUTION_WIDE_ROLES: readonly string[] = ['owner', 'admin', 'auditor'];

export function campusScopeOf(account: DemoAccount): CampusScope {
  return INSTITUTION_WIDE_ROLES.includes(account.roleId) ? 'all' : [account.campusId];
}
