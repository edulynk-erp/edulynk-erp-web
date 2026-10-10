import type { ModuleId } from '@/config/modules';
import type {
  AcademicUnitKind,
  GradingMethod,
  InstitutionType,
  InstitutionTypeDetails,
  LocationKind,
  PeriodType,
  StructureSettings,
} from '@/domain/institution';

/**
 * What each institution type means for the ERP: its vocabulary, how its academic structure nests, which kinds of
 * location it can have and its starting defaults. Screens read terminology and structure from here instead of
 * assuming a school.
 */

/** Attributes a structure level can collect. */
export type UnitField =
  | 'code'
  | 'campus'
  | 'duration'
  | 'periods'
  | 'credits'
  | 'courseType'
  | 'programmeLevel'
  | 'degree'
  | 'research'
  | 'practical'
  | 'capacity'
  | 'dates'
  | 'schedule'
  | 'marks'
  | 'weightage'
  | 'members';

export interface StructureLevel {
  readonly kind: AcademicUnitKind;
  /** Default singular name; institutions can rename it. */
  readonly singular: string;
  readonly plural: string;
  readonly description: string;
  /** Kinds an entry may sit under. Empty for top-level entries. */
  readonly parents: readonly AcademicUnitKind[];
  readonly parentRequired: boolean;
  readonly fields: readonly UnitField[];
  /** Fields that must be filled in (beyond name). */
  readonly required: readonly UnitField[];
}

export interface Terminology {
  readonly learner: string;
  readonly learners: string;
  readonly educator: string;
  readonly educators: string;
  /** The main unit students are enrolled in (Class, Programme, Course…). */
  readonly unit: string;
  readonly units: string;
  /** The teaching group (Section, Batch…). */
  readonly group: string;
  readonly groups: string;
  /** The working day (“School day”, “College day”…). */
  readonly day: string;
}

export interface InstitutionTypeProfile {
  readonly id: InstitutionType;
  readonly label: string;
  readonly description: string;
  readonly terms: Terminology;
  /** The academic structure as a configuration flow, top to bottom. */
  readonly levels: readonly StructureLevel[];
  /** Schools use the dedicated Classes, Sections and Subjects screens in addition to `levels`. */
  readonly usesSchoolClasses: boolean;
  readonly locationKinds: readonly LocationKind[];
  readonly defaultStructure: StructureSettings;
  readonly defaultGradingMethod: GradingMethod;
  /** Modules that matter most for this type (highlighted on the entitlements tab). */
  readonly keyModules: readonly ModuleId[];
}

const level = (
  kind: AcademicUnitKind,
  singular: string,
  plural: string,
  description: string,
  options: {
    parents?: readonly AcademicUnitKind[];
    parentRequired?: boolean;
    fields?: readonly UnitField[];
    required?: readonly UnitField[];
  } = {},
): StructureLevel => ({
  kind,
  singular,
  plural,
  description,
  parents: options.parents ?? [],
  parentRequired: options.parentRequired ?? false,
  fields: options.fields ?? ['code'],
  required: options.required ?? ['code'],
});

const structure = (periodType: PeriodType, periodsPerYear: number): StructureSettings => ({
  labels: {},
  periodType,
  periodsPerYear,
});

export const INSTITUTION_TYPE_PROFILES: Readonly<Record<InstitutionType, InstitutionTypeProfile>> = {
  school: {
    id: 'school',
    label: 'School',
    description: 'Pre-primary to Class 12, organised into classes and sections under a school board.',
    terms: {
      learner: 'Student',
      learners: 'Students',
      educator: 'Teacher',
      educators: 'Teachers',
      unit: 'Class',
      units: 'Classes',
      group: 'Section',
      groups: 'Sections',
      day: 'School day',
    },
    levels: [
      level('exam', 'Examination', 'Terms & Examinations', 'Unit tests, term examinations and their weightage.', {
        fields: ['code', 'marks', 'weightage', 'dates'],
        required: ['code', 'marks'],
      }),
    ],
    usesSchoolClasses: true,
    locationKinds: ['campus', 'branch'],
    defaultStructure: structure('term', 2),
    defaultGradingMethod: 'grades',
    keyModules: ['admissions', 'attendance', 'timetable', 'examinations', 'fees', 'transport'],
  },
  'junior-college': {
    id: 'junior-college',
    label: 'Junior / Intermediate College',
    description: 'Intermediate (Classes 11–12) with groups or streams such as MPC, BiPC, CEC and MEC.',
    terms: {
      learner: 'Student',
      learners: 'Students',
      educator: 'Lecturer',
      educators: 'Lecturers',
      unit: 'Year',
      units: 'Years',
      group: 'Group',
      groups: 'Groups',
      day: 'College day',
    },
    levels: [
      level('grade', 'Year', 'Years / Grades', 'First year, second year or the grades your board uses.'),
      level('stream', 'Group', 'Groups / Streams', 'Streams such as MPC, BiPC, CEC or MEC, with intake per campus.', {
        fields: ['code', 'capacity', 'campus'],
      }),
      level('subject', 'Subject', 'Subjects', 'Every subject taught, including practical subjects.', {
        fields: ['code', 'courseType', 'practical', 'marks'],
      }),
      level('combination', 'Subject Combination', 'Subject Combinations', 'The subjects a group studies together.', {
        parents: ['stream'],
        parentRequired: true,
        fields: ['code', 'members'],
        required: ['code', 'members'],
      }),
      level('exam', 'Examination', 'Examinations', 'Unit tests, quarterly, half-yearly, pre-final and board exams.', {
        parents: ['grade'],
        fields: ['code', 'marks', 'weightage', 'dates'],
        required: ['code', 'marks'],
      }),
    ],
    usesSchoolClasses: false,
    locationKinds: ['campus', 'branch'],
    defaultStructure: structure('annual', 1),
    defaultGradingMethod: 'marks',
    keyModules: ['admissions', 'attendance', 'timetable', 'examinations', 'fees', 'hostel'],
  },
  'degree-college': {
    id: 'degree-college',
    label: 'Degree College',
    description: 'Undergraduate and postgraduate programmes, usually affiliated to a university.',
    terms: {
      learner: 'Student',
      learners: 'Students',
      educator: 'Faculty member',
      educators: 'Faculty',
      unit: 'Programme',
      units: 'Programmes',
      group: 'Section',
      groups: 'Sections',
      day: 'College day',
    },
    levels: [
      level('department', 'Department', 'Departments', 'Academic departments that run programmes.'),
      level('programme', 'Programme', 'Programmes', 'Degrees offered, with duration, semesters and intake.', {
        parents: ['department'],
        parentRequired: true,
        fields: ['code', 'degree', 'programmeLevel', 'duration', 'periods', 'capacity', 'campus'],
        required: ['code', 'degree', 'programmeLevel', 'duration', 'periods'],
      }),
      level('semester', 'Semester', 'Years / Semesters', 'The semesters (or years) of each programme.', {
        parents: ['programme'],
        parentRequired: true,
      }),
      level('course', 'Course', 'Courses & Electives', 'Courses per semester with credits; mark electives here.', {
        parents: ['semester'],
        parentRequired: true,
        fields: ['code', 'courseType', 'credits', 'practical', 'marks'],
        required: ['code', 'courseType', 'credits'],
      }),
    ],
    usesSchoolClasses: false,
    locationKinds: ['campus', 'study-centre'],
    defaultStructure: structure('semester', 2),
    defaultGradingMethod: 'cgpa',
    keyModules: ['college', 'admissions', 'attendance', 'examinations', 'fees', 'library'],
  },
  university: {
    id: 'university',
    label: 'University',
    description: 'Faculties, departments and programmes, with constituent or affiliated colleges where applicable.',
    terms: {
      learner: 'Student',
      learners: 'Students',
      educator: 'Faculty member',
      educators: 'Faculty',
      unit: 'Programme',
      units: 'Programmes',
      group: 'Section',
      groups: 'Sections',
      day: 'Working day',
    },
    levels: [
      level('faculty', 'Faculty', 'Faculties / Schools', 'Faculties or schools of study.'),
      level('department', 'Department', 'Departments', 'Departments within each faculty.', {
        parents: ['faculty'],
        parentRequired: true,
      }),
      level('programme', 'Programme', 'Programmes', 'Programmes with level, duration, semesters and research.', {
        parents: ['department'],
        parentRequired: true,
        fields: ['code', 'degree', 'programmeLevel', 'duration', 'periods', 'research', 'capacity', 'campus'],
        required: ['code', 'degree', 'programmeLevel', 'duration', 'periods'],
      }),
      level('semester', 'Semester', 'Semesters / Terms', 'The semesters or terms of each programme.', {
        parents: ['programme'],
        parentRequired: true,
      }),
      level('course', 'Course', 'Courses & Credits', 'Courses per semester, credits and electives.', {
        parents: ['semester'],
        parentRequired: true,
        fields: ['code', 'courseType', 'credits', 'practical', 'marks'],
        required: ['code', 'courseType', 'credits'],
      }),
    ],
    usesSchoolClasses: false,
    locationKinds: ['campus', 'constituent-college', 'affiliated-college', 'study-centre'],
    defaultStructure: structure('semester', 2),
    defaultGradingMethod: 'cgpa',
    keyModules: ['college', 'admissions', 'examinations', 'fees', 'library', 'hostel'],
  },
  coaching: {
    id: 'coaching',
    label: 'Coaching / Training Institute',
    description: 'Courses delivered in batches, with modules, schedules and assessments.',
    terms: {
      learner: 'Learner',
      learners: 'Learners',
      educator: 'Trainer',
      educators: 'Trainers',
      unit: 'Course',
      units: 'Courses',
      group: 'Batch',
      groups: 'Batches',
      day: 'Centre day',
    },
    levels: [
      level('course', 'Course', 'Courses', 'Courses or training programmes with their duration.', {
        fields: ['code', 'duration'],
        required: ['code', 'duration'],
      }),
      level('batch', 'Batch', 'Batches', 'Batches of a course at a centre, with dates and seats.', {
        parents: ['course'],
        parentRequired: true,
        fields: ['code', 'campus', 'capacity', 'dates'],
        required: ['code', 'capacity', 'dates'],
      }),
      level('module', 'Module', 'Subjects / Modules', 'Subjects or modules covered in a course.', {
        parents: ['course'],
        parentRequired: true,
      }),
      level('schedule', 'Schedule', 'Schedules', 'When a batch meets.', {
        parents: ['batch'],
        parentRequired: true,
        fields: ['schedule', 'dates'],
        required: ['schedule'],
      }),
      level('assessment', 'Assessment', 'Assessments', 'Tests, mock exams and assignments.', {
        parents: ['course'],
        parentRequired: true,
        fields: ['code', 'marks', 'weightage', 'dates'],
        required: ['code', 'marks'],
      }),
    ],
    usesSchoolClasses: false,
    locationKinds: ['branch', 'campus', 'study-centre'],
    defaultStructure: structure('quarter', 4),
    defaultGradingMethod: 'marks',
    keyModules: ['admissions', 'attendance', 'timetable', 'examinations', 'fees', 'communication'],
  },
  other: {
    id: 'other',
    label: 'Other Educational Institution',
    description: 'Any other education provider. Define your own programmes, groups and assessments.',
    terms: {
      learner: 'Learner',
      learners: 'Learners',
      educator: 'Instructor',
      educators: 'Instructors',
      unit: 'Programme',
      units: 'Programmes',
      group: 'Group',
      groups: 'Groups',
      day: 'Working day',
    },
    levels: [
      level('programme', 'Programme', 'Programmes', 'What you offer, with its duration.', {
        fields: ['code', 'duration', 'capacity', 'campus'],
      }),
      level('batch', 'Group', 'Groups', 'Groups or cohorts within a programme.', {
        parents: ['programme'],
        fields: ['code', 'capacity', 'schedule'],
      }),
      level('module', 'Module', 'Modules', 'Subjects or modules.', {
        parents: ['programme'],
        fields: ['code', 'credits'],
      }),
      level('assessment', 'Assessment', 'Assessments', 'How learners are assessed.', {
        parents: ['programme'],
        fields: ['code', 'marks', 'weightage'],
        required: ['code'],
      }),
    ],
    usesSchoolClasses: false,
    locationKinds: ['campus', 'branch', 'study-centre'],
    defaultStructure: structure('term', 2),
    defaultGradingMethod: 'marks',
    keyModules: ['admissions', 'attendance', 'examinations', 'fees', 'communication'],
  },
};

export const INSTITUTION_TYPE_LABELS: Readonly<Record<InstitutionType, string>> = Object.fromEntries(
  Object.values(INSTITUTION_TYPE_PROFILES).map((profile) => [profile.id, profile.label]),
) as Record<InstitutionType, string>;

export function profileOf(type: InstitutionType): InstitutionTypeProfile {
  return INSTITUTION_TYPE_PROFILES[type];
}

export function levelOf(type: InstitutionType, kind: AcademicUnitKind): StructureLevel | undefined {
  return INSTITUTION_TYPE_PROFILES[type].levels.find((candidate) => candidate.kind === kind);
}

/** The institution's own name for a level, or the default. */
export function levelName(level: StructureLevel, settings: StructureSettings | undefined): string {
  return settings?.labels[level.kind]?.trim() || level.singular;
}

/** Plural heading for a level: the default plural unless the institution renamed it. */
export function levelPlural(level: StructureLevel, settings: StructureSettings | undefined): string {
  const custom = settings?.labels[level.kind]?.trim();
  if (!custom) return level.plural;
  return /(s|x|ch|sh)$/i.test(custom)
    ? `${custom}es`
    : /[^aeiou]y$/i.test(custom)
      ? `${custom.slice(0, -1)}ies`
      : `${custom}s`;
}

/** Blank details for every type; the selected type's details are filled in on General Information. */
export function emptyTypeDetails(): InstitutionTypeDetails {
  return {
    school: { boardId: '', affiliationNumber: '', udiseCode: '' },
    'junior-college': { boardId: '', collegeCode: '', affiliationNumber: '' },
    'degree-college': {
      affiliatingUniversity: '',
      collegeCode: '',
      affiliationNumber: '',
      autonomous: false,
      accreditationId: '',
    },
    university: { universityCategoryId: '', recognitionDetails: '', accreditationId: '' },
    coaching: { courseCategoryIds: [], registrationNumber: '' },
    other: { description: '', registrationNumber: '' },
  };
}

export function defaultStructureSettings(): Record<InstitutionType, StructureSettings> {
  return Object.fromEntries(
    Object.values(INSTITUTION_TYPE_PROFILES).map((profile) => [
      profile.id,
      { ...profile.defaultStructure, labels: {} },
    ]),
  ) as Record<InstitutionType, StructureSettings>;
}

export const PERIOD_TYPE_LABELS: Readonly<Record<PeriodType, { singular: string; plural: string }>> = {
  term: { singular: 'Term', plural: 'Terms' },
  semester: { singular: 'Semester', plural: 'Semesters' },
  trimester: { singular: 'Trimester', plural: 'Trimesters' },
  quarter: { singular: 'Quarter', plural: 'Quarters' },
  annual: { singular: 'Annual session', plural: 'Annual sessions' },
};

export const LOCATION_KIND_LABELS: Readonly<Record<LocationKind, string>> = {
  campus: 'Campus',
  'constituent-college': 'Constituent College',
  'affiliated-college': 'Affiliated College',
  branch: 'Branch / Centre',
  'study-centre': 'Study Centre',
};
