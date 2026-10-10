import type { ReferenceOption } from '@/config/institution';

/**
 * Job titles for staff and user accounts. Records store the designation `id`; screens show the `name`. Mock reference
 * data until the institution API provides it.
 */
export const DESIGNATIONS: readonly ReferenceOption[] = [
  // Leadership and administration
  { id: 'dsg_chairman_owner', name: 'Chairman & Owner' },
  { id: 'dsg_administrative_officer', name: 'Administrative Officer' },
  { id: 'dsg_principal', name: 'Principal' },
  { id: 'dsg_vice_principal', name: 'Vice Principal' },
  { id: 'dsg_academic_coordinator', name: 'Academic Coordinator' },
  { id: 'dsg_internal_auditor', name: 'Internal Auditor' },
  { id: 'dsg_office_assistant', name: 'Office Assistant' },
  { id: 'dsg_front_office_executive', name: 'Front Office Executive' },
  // Teaching
  { id: 'dsg_prt_class_teacher', name: 'PRT (Class Teacher)' },
  { id: 'dsg_tgt_class_teacher', name: 'TGT (Class Teacher)' },
  { id: 'dsg_tgt_mathematics', name: 'TGT Mathematics' },
  { id: 'dsg_tgt_science', name: 'TGT Science' },
  { id: 'dsg_tgt_english', name: 'TGT English' },
  { id: 'dsg_tgt_hindi', name: 'TGT Hindi' },
  { id: 'dsg_tgt_telugu', name: 'TGT Telugu' },
  { id: 'dsg_tgt_social_studies', name: 'TGT Social Studies' },
  { id: 'dsg_pgt_physics', name: 'PGT Physics' },
  { id: 'dsg_pgt_chemistry', name: 'PGT Chemistry' },
  { id: 'dsg_pgt_biology', name: 'PGT Biology' },
  { id: 'dsg_pgt_computer_science', name: 'PGT Computer Science' },
  { id: 'dsg_physical_education_teacher', name: 'Physical Education Teacher' },
  { id: 'dsg_sports_coordinator', name: 'Sports Coordinator' },
  // Finance, HR and admissions
  { id: 'dsg_senior_accountant', name: 'Senior Accountant' },
  { id: 'dsg_accounts_assistant', name: 'Accounts Assistant' },
  { id: 'dsg_fee_counter_executive', name: 'Fee Counter Executive' },
  { id: 'dsg_hr_manager', name: 'HR Manager' },
  { id: 'dsg_hr_executive', name: 'HR Executive' },
  { id: 'dsg_admissions_officer', name: 'Admissions Officer' },
  { id: 'dsg_admissions_counsellor', name: 'Admissions Counsellor' },
  // Library, transport, hostel and IT
  { id: 'dsg_librarian', name: 'Librarian' },
  { id: 'dsg_library_assistant', name: 'Library Assistant' },
  { id: 'dsg_transport_supervisor', name: 'Transport Supervisor' },
  { id: 'dsg_bus_coordinator', name: 'Bus Coordinator' },
  { id: 'dsg_hostel_warden', name: 'Hostel Warden' },
  { id: 'dsg_it_support_engineer', name: 'IT Support Engineer' },
];

export function isDesignationId(id: string): boolean {
  return DESIGNATIONS.some((designation) => designation.id === id);
}

export function designationName(id: string | null | undefined): string {
  return DESIGNATIONS.find((designation) => designation.id === id)?.name ?? '—';
}
