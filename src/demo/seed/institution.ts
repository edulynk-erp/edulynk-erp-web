import { CITY_CAMPUS_ID, DEMO_EMAIL_DOMAIN, DEMO_TENANT_ID, MAIN_CAMPUS_ID } from '@/demo/access/accounts';
import { gradingDefaultsFor } from '@/config/grading';
import { defaultStructureSettings, emptyTypeDetails } from '@/config/institution-types';
import { MODULES } from '@/config/modules';
import type { IsoDate } from '@/domain/common';
import type {
  AcademicTerm,
  AcademicUnit,
  AcademicYear,
  Campus,
  Department,
  FeatureEntitlement,
  GradingConfig,
  Institution,
  SchoolClass,
  Section,
  Subject,
} from '@/domain/institution';
import { addDays, istDateTime } from '@/lib/format/date';

const tenantId = DEMO_TENANT_ID;

export function seedInstitution(today: IsoDate): Institution {
  return {
    tenantId,
    id: 'ins_greenwood_hyd',
    name: 'Greenwood International School',
    shortName: 'GIS',
    type: 'school',
    category: 'private-unaided',
    typeDetails: {
      ...emptyTypeDetails(),
      school: { boardId: 'brd_cbse', affiliationNumber: 'CBSE/AFF/3630258', udiseCode: '36291104567' },
    },
    establishedYear: 2004,
    website: 'https://www.greenwood.edu.in',
    contactEmail: `office@${DEMO_EMAIL_DOMAIN}`,
    studentCapacity: 2400,
    mediumId: 'med_english',
    contactPerson: 'Ramesh Kumar',
    contactDesignation: 'Chairman',
    phone: '+91 40 4012 3456',
    alternatePhone: '+91 98765 43211',
    contactPersonEmail: `principal@${DEMO_EMAIL_DOMAIN}`,
    supportEmail: 'support@edulynk.example',
    addressLine1: 'Plot 14, Financial District, Gachibowli',
    addressLine2: 'Near ISB Road',
    countryId: 'cn_in',
    stateId: 'st_in_tg',
    districtId: 'dst_tg_rangareddy',
    cityId: 'cit_tg_hyderabad',
    pinCode: '500032',
    policies: {
      workingDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
      schoolStartsAt: '08:30',
      schoolEndsAt: '15:30',
      minimumAttendancePercent: 75,
      lateArrivalGraceMinutes: 10,
      feeDueDay: 10,
      lateFeePerDay: 50,
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '12h',
      timezone: 'Asia/Kolkata',
      languageId: 'lng_en',
      notifyGuardiansOnAbsence: true,
      sendFeeReminders: true,
      publishResultsOnline: false,
    },
    branding: {
      displayName: 'Greenwood International School',
      tagline: 'Learning today, leading tomorrow',
      primaryColor: '#2563eb',
      accentColor: '#f59e0b',
      logoDataUrl: null,
    },
    structure: defaultStructureSettings(),
    plan: 'Premium',
    onboardingStatus: 'onboarded',
    onboardedAt: istDateTime(addDays(today, -1), 10, 30),
    updatedAt: null,
    updatedBy: null,
  };
}

export const CAMPUSES: readonly Campus[] = [
  {
    tenantId,
    id: MAIN_CAMPUS_ID,
    kind: 'campus',
    name: 'Main Campus',
    code: 'GIS-MC',
    address: 'Plot 14, Financial District, Gachibowli',
    cityId: 'cit_tg_hyderabad',
    pinCode: '500032',
    contactPerson: 'Dr. Meena Reddy',
    phone: '+91 40 4012 3456',
    email: `main@${DEMO_EMAIL_DOMAIN}`,
    status: 'active',
  },
  {
    tenantId,
    id: CITY_CAMPUS_ID,
    kind: 'campus',
    name: 'City Campus',
    code: 'GIS-CC',
    address: 'Road No. 3, KPHB Colony, Kukatpally',
    cityId: 'cit_tg_hyderabad',
    pinCode: '500072',
    contactPerson: '',
    phone: '+91 40 4012 7890',
    email: `city@${DEMO_EMAIL_DOMAIN}`,
    status: 'active',
  },
];

export const DEPARTMENTS: readonly Department[] = [
  ['administration', 'Administration', 'ADMIN'],
  ['academics-primary', 'Academics – Primary', 'ACAD-PRI'],
  ['academics-secondary', 'Academics – Secondary', 'ACAD-SEC'],
  ['mathematics', 'Mathematics', 'MATH'],
  ['science', 'Science', 'SCI'],
  ['languages', 'Languages', 'LANG'],
  ['social-studies', 'Social Studies', 'SST'],
  ['computer-science', 'Computer Science', 'CS'],
  ['physical-education', 'Physical Education', 'PE'],
  ['finance', 'Finance & Accounts', 'FIN'],
  ['hr', 'Human Resources', 'HR'],
  ['admissions', 'Admissions', 'ADM'],
  ['library', 'Library', 'LIB'],
  ['transport', 'Transport', 'TRN'],
  ['hostel', 'Hostel', 'HST'],
].map(([key, name, code]) => ({ tenantId, id: departmentId(key!), name: name!, code: code! }));

type SubjectSeed = [code: string, name: string, kind: Subject['kind'], from: number, to: number, department: string];

export const SUBJECTS: readonly Subject[] = (
  [
    ['ENG', 'English', 'language', -2, 12, 'languages'],
    ['HIN', 'Hindi', 'language', 1, 10, 'languages'],
    ['TEL', 'Telugu', 'language', 1, 10, 'languages'],
    ['MATH', 'Mathematics', 'core', -2, 12, 'mathematics'],
    ['EVS', 'Environmental Studies', 'core', 1, 5, 'science'],
    ['SCI', 'Science', 'core', 6, 10, 'science'],
    ['SST', 'Social Studies', 'core', 6, 10, 'social-studies'],
    ['PHY', 'Physics', 'core', 11, 12, 'science'],
    ['CHEM', 'Chemistry', 'core', 11, 12, 'science'],
    ['BIO', 'Biology', 'elective', 11, 12, 'science'],
    ['ACC', 'Accountancy', 'elective', 11, 12, 'finance'],
    ['ECO', 'Economics', 'elective', 11, 12, 'social-studies'],
    ['CS', 'Computer Science', 'elective', 3, 12, 'computer-science'],
    ['PE', 'Physical Education', 'co-curricular', -2, 12, 'physical-education'],
    ['ART', 'Art & Craft', 'co-curricular', -2, 8, 'academics-primary'],
  ] satisfies SubjectSeed[]
).map(([code, name, kind, levelFrom, levelTo, department]) => ({
  tenantId,
  id: `sub_${code.toLowerCase()}`,
  name,
  code,
  kind,
  levelFrom,
  levelTo,
  departmentId: departmentId(department),
}));

export function departmentId(key: string): string {
  return `dep_${key.replace(/-/g, '_')}`;
}

/** Indian academic years run April to March. */
export function academicYearStart(today: IsoDate): number {
  const year = Number(today.slice(0, 4));
  return Number(today.slice(5, 7)) >= 4 ? year : year - 1;
}

export function academicYearId(startYear: number): string {
  return `ay_${startYear}_${String((startYear + 1) % 100).padStart(2, '0')}`;
}

export function seedAcademicYears(today: IsoDate): AcademicYear[] {
  const current = academicYearStart(today);
  return [current - 2, current - 1, current, current + 1].map((start) => ({
    tenantId,
    id: academicYearId(start),
    label: `${start}–${String((start + 1) % 100).padStart(2, '0')}`,
    startsOn: `${start}-04-01`,
    endsOn: `${start + 1}-03-31`,
    status: start < current ? 'closed' : start === current ? 'current' : 'planned',
  }));
}

export function className(level: number): string {
  if (level === -2) return 'Nursery';
  if (level === -1) return 'LKG';
  if (level === 0) return 'UKG';
  return `Class ${level}`;
}

interface CampusPlan {
  readonly campusId: string;
  readonly levels: readonly number[];
  readonly sections: readonly string[];
}

export const CAMPUS_PLANS: readonly CampusPlan[] = [
  { campusId: MAIN_CAMPUS_ID, levels: [-2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], sections: ['A', 'B', 'C'] },
  { campusId: CITY_CAMPUS_ID, levels: [1, 2, 3, 4, 5, 6, 7, 8], sections: ['A', 'B'] },
];

export function seedClassesAndSections(yearId: string): { classes: SchoolClass[]; sections: Section[] } {
  const classes: SchoolClass[] = [];
  const sections: Section[] = [];
  for (const plan of CAMPUS_PLANS) {
    const campusCode = plan.campusId.replace('cmp_', '');
    for (const level of plan.levels) {
      const classId = `cls_${campusCode}_${level < 1 ? ['nur', 'lkg', 'ukg'][level + 2] : String(level).padStart(2, '0')}`;
      classes.push({ tenantId, campusId: plan.campusId, id: classId, name: className(level), level });
      for (const name of plan.sections) {
        sections.push({
          tenantId,
          campusId: plan.campusId,
          academicYearId: yearId,
          id: `sec_${classId.slice(4)}_${name.toLowerCase()}`,
          classId,
          name,
          classTeacherId: null,
          capacity: plan.campusId === MAIN_CAMPUS_ID ? 36 : 32,
        });
      }
    }
  }
  return { classes, sections };
}

/** Two terms per academic year (April–September, October–March). */
export function seedAcademicTerms(years: readonly AcademicYear[]): AcademicTerm[] {
  return years.flatMap((year) => {
    const start = Number(year.startsOn.slice(0, 4));
    return [
      {
        tenantId,
        id: `trm_${year.id.slice(3)}_1`,
        academicYearId: year.id,
        name: 'Term 1',
        startsOn: `${start}-04-01`,
        endsOn: `${start}-09-30`,
      },
      {
        tenantId,
        id: `trm_${year.id.slice(3)}_2`,
        academicYearId: year.id,
        name: 'Term 2',
        startsOn: `${start}-10-01`,
        endsOn: `${start + 1}-03-31`,
      },
    ];
  });
}

const BLANK_UNIT = {
  tenantId,
  parentId: null,
  campusId: null,
  status: 'active',
  durationValue: null,
  durationUnit: null,
  periods: null,
  credits: null,
  courseType: null,
  programmeLevel: null,
  degree: '',
  research: false,
  practical: false,
  capacity: null,
  startsOn: null,
  endsOn: null,
  schedule: '',
  maxMarks: null,
  weightage: null,
  memberIds: [],
} as const satisfies Partial<AcademicUnit>;

/** The school's examination pattern. Other institution types start empty and can load a starter structure. */
export function seedAcademicUnits(yearStart: number): AcademicUnit[] {
  const exams: [string, string, number, number, string, string][] = [
    ['PT1', 'Periodic Test 1', 40, 5, `${yearStart}-07-14`, `${yearStart}-07-19`],
    ['HY', 'Half-Yearly Examination', 80, 30, `${yearStart}-09-15`, `${yearStart}-09-26`],
    ['PT2', 'Periodic Test 2', 40, 5, `${yearStart}-12-08`, `${yearStart}-12-13`],
    ['ANNUAL', 'Annual Examination', 80, 60, `${yearStart + 1}-02-23`, `${yearStart + 1}-03-14`],
  ];
  return exams.map(([code, name, maxMarks, weightage, startsOn, endsOn]) => ({
    ...BLANK_UNIT,
    id: `unt_exam_${code.toLowerCase()}`,
    institutionType: 'school',
    kind: 'exam',
    name,
    code,
    maxMarks,
    weightage,
    startsOn,
    endsOn,
    memberIds: [],
  }));
}

export function seedGrading(): GradingConfig {
  return { tenantId, ...gradingDefaultsFor('school'), updatedAt: null, updatedBy: null };
}

const ADD_ONS = new Set(['college', 'hostel', 'transport', 'payroll']);
const LIMITS: Partial<Record<string, string>> = {
  institution: 'Up to 5 campuses or locations',
  users: 'Up to 250 staff accounts',
  students: 'Up to 3,000 active students',
};

/** What the Premium plan includes. Platform-managed: the institution can see but never change this. */
export function seedEntitlements(): FeatureEntitlement[] {
  return MODULES.filter((module) => module.id !== 'help').map((module) => ({
    moduleId: module.id,
    status: module.concept ? 'not-included' : ADD_ONS.has(module.id) ? 'add-on' : 'included',
    limit: LIMITS[module.id] ?? null,
  }));
}
