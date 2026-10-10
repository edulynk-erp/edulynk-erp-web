import {
  BookOpen,
  Briefcase,
  Bus,
  Calculator,
  ClipboardCheck,
  Crown,
  Library,
  School,
  ScrollText,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UserCog,
  type LucideIcon,
} from 'lucide-react';

export interface RoleStyle {
  readonly icon: LucideIcon;
  /** Badge and icon-tile colours. */
  readonly tone: string;
}

const STYLES: Record<string, RoleStyle> = {
  owner: { icon: Crown, tone: 'bg-[#ede9fe] text-[#5b21b6]' },
  admin: { icon: ShieldCheck, tone: 'bg-[#dbeafe] text-[#1e40af]' },
  principal: { icon: School, tone: 'bg-[#e0f2fe] text-[#075985]' },
  'vice-principal': { icon: UserCheck, tone: 'bg-[#d1fae5] text-[#065f46]' },
  'academic-coordinator': { icon: ClipboardCheck, tone: 'bg-[#ccfbf1] text-[#115e59]' },
  teacher: { icon: BookOpen, tone: 'bg-[#fef3c7] text-[#92400e]' },
  'admissions-officer': { icon: ScrollText, tone: 'bg-[#fce7f3] text-[#9d174d]' },
  accountant: { icon: Calculator, tone: 'bg-[#dcfce7] text-[#166534]' },
  'hr-admin': { icon: Briefcase, tone: 'bg-[#ffedd5] text-[#9a3412]' },
  librarian: { icon: Library, tone: 'bg-[#f3e8ff] text-[#6b21a8]' },
  'transport-hostel': { icon: Bus, tone: 'bg-[#fef9c3] text-[#854d0e]' },
  auditor: { icon: UserCog, tone: 'bg-[#f1f5f9] text-[#334155]' },
};

/** Institution-defined (custom) roles. */
const CUSTOM: RoleStyle = { icon: Sparkles, tone: 'bg-[#e0e7ff] text-[#4338ca]' };

export function roleStyle(roleId: string): RoleStyle {
  return STYLES[roleId] ?? CUSTOM;
}
