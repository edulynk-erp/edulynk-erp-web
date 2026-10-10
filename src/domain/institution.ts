import type { ModuleId } from '@/config/modules';
import type { CampusScoped, IsoDate, IsoDateTime, TenantScoped, YearScoped } from '@/domain/common';

export const INSTITUTION_TYPES = [
  'school',
  'junior-college',
  'degree-college',
  'university',
  'coaching',
  'other',
] as const;
export type InstitutionType = (typeof INSTITUTION_TYPES)[number];

/** Ownership and management of the institution. */
export const INSTITUTION_CATEGORIES = [
  'private-unaided',
  'private-aided',
  'government',
  'autonomous',
  'deemed',
  'trust-society',
  'other',
] as const;
export type InstitutionCategory = (typeof INSTITUTION_CATEGORIES)[number];

export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export const DATE_FORMATS = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'] as const;
export type DateFormatPreference = (typeof DATE_FORMATS)[number];

export const TIME_FORMATS = ['12h', '24h'] as const;
export type TimeFormatPreference = (typeof TIME_FORMATS)[number];

export interface InstitutionPolicies {
  readonly workingDays: readonly Weekday[];
  /** `HH:MM`, 24-hour clock in the institution time zone. */
  readonly schoolStartsAt: string;
  readonly schoolEndsAt: string;
  readonly minimumAttendancePercent: number;
  readonly lateArrivalGraceMinutes: number;
  /** Day of the month fees fall due (1–28). */
  readonly feeDueDay: number;
  readonly lateFeePerDay: number;
  readonly dateFormat: DateFormatPreference;
  readonly timeFormat: TimeFormatPreference;
  /** IANA time zone from `TIMEZONES`. */
  readonly timezone: string;
  /** From `LANGUAGES`. */
  readonly languageId: string;
  readonly notifyGuardiansOnAbsence: boolean;
  readonly sendFeeReminders: boolean;
  readonly publishResultsOnline: boolean;
}

export interface InstitutionBranding {
  readonly displayName: string;
  readonly tagline: string;
  /** `#rrggbb`. */
  readonly primaryColor: string;
  /** Secondary colour, `#rrggbb`. */
  readonly accentColor: string;
  /** A `data:image/…` URL kept in this browser only; null shows the initials mark. */
  readonly logoDataUrl: string | null;
}

// Type-specific identifiers. Every type keeps its own details, so switching type never discards what was entered.

export interface SchoolDetails {
  /** From `EDUCATION_BOARDS`. */
  readonly boardId: string;
  readonly affiliationNumber: string;
  readonly udiseCode: string;
}

export interface JuniorCollegeDetails {
  /** From `INTERMEDIATE_BOARDS`. */
  readonly boardId: string;
  readonly collegeCode: string;
  readonly affiliationNumber: string;
}

export interface DegreeCollegeDetails {
  readonly affiliatingUniversity: string;
  readonly collegeCode: string;
  readonly affiliationNumber: string;
  readonly autonomous: boolean;
  /** From `ACCREDITATIONS`; empty when not accredited or not applicable. */
  readonly accreditationId: string;
}

export interface UniversityDetails {
  /** From `UNIVERSITY_CATEGORIES`. */
  readonly universityCategoryId: string;
  /** Recognition or regulatory approvals that apply, as entered by the institution. */
  readonly recognitionDetails: string;
  readonly accreditationId: string;
}

export interface CoachingDetails {
  /** From `COURSE_CATEGORIES`. */
  readonly courseCategoryIds: readonly string[];
  readonly registrationNumber: string;
}

export interface OtherDetails {
  readonly description: string;
  readonly registrationNumber: string;
}

export interface InstitutionTypeDetails {
  readonly school: SchoolDetails;
  readonly 'junior-college': JuniorCollegeDetails;
  readonly 'degree-college': DegreeCollegeDetails;
  readonly university: UniversityDetails;
  readonly coaching: CoachingDetails;
  readonly other: OtherDetails;
}

export const PERIOD_TYPES = ['term', 'semester', 'trimester', 'quarter', 'annual'] as const;
export type PeriodType = (typeof PERIOD_TYPES)[number];

/** How an institution names and divides its own academic structure. One entry per institution type. */
export interface StructureSettings {
  /** Custom singular names for structure levels, keyed by unit kind. A missing or empty entry uses the default. */
  readonly labels: Readonly<Partial<Record<AcademicUnitKind, string>>>;
  readonly periodType: PeriodType;
  readonly periodsPerYear: number;
}

export interface Institution extends TenantScoped {
  readonly id: string;
  // General information
  readonly name: string;
  readonly shortName: string;
  readonly type: InstitutionType;
  readonly category: InstitutionCategory;
  readonly typeDetails: InstitutionTypeDetails;
  readonly establishedYear: number;
  readonly website: string;
  /** The institution's official email address. */
  readonly contactEmail: string;
  readonly studentCapacity: number;
  /** From `MEDIUMS`. */
  readonly mediumId: string;
  // Contact details
  readonly contactPerson: string;
  readonly contactDesignation: string;
  /** Primary contact number. */
  readonly phone: string;
  readonly alternatePhone: string;
  readonly contactPersonEmail: string;
  readonly supportEmail: string;
  // Address
  readonly addressLine1: string;
  readonly addressLine2: string;
  /** Location IDs from the `COUNTRIES` reference data. */
  readonly countryId: string;
  readonly stateId: string;
  readonly districtId: string;
  readonly cityId: string;
  readonly pinCode: string;
  // Settings
  readonly policies: InstitutionPolicies;
  readonly branding: InstitutionBranding;
  readonly structure: Readonly<Record<InstitutionType, StructureSettings>>;
  // Subscription and lifecycle (managed by the platform, read-only here)
  readonly plan: string;
  readonly onboardingStatus: 'onboarded' | 'pending';
  readonly onboardedAt: IsoDateTime;
  readonly updatedAt: IsoDateTime | null;
  readonly updatedBy: string | null;
}

export const LOCATION_KINDS = [
  'campus',
  'constituent-college',
  'affiliated-college',
  'branch',
  'study-centre',
] as const;
export type LocationKind = (typeof LOCATION_KINDS)[number];

/** A campus or other location (constituent college, affiliated college, branch, study centre). */
export interface Campus extends TenantScoped {
  readonly id: string;
  readonly kind: LocationKind;
  readonly name: string;
  readonly code: string;
  readonly address: string;
  readonly cityId: string;
  readonly pinCode: string;
  readonly contactPerson: string;
  readonly phone: string;
  readonly email: string;
  readonly status: 'active' | 'inactive';
}

export interface AcademicYear extends TenantScoped {
  readonly id: string;
  readonly label: string;
  readonly startsOn: IsoDate;
  readonly endsOn: IsoDate;
  readonly status: 'current' | 'closed' | 'planned';
}

/** A term, semester, trimester or quarter inside an academic year (named by `StructureSettings.periodType`). */
export interface AcademicTerm extends TenantScoped {
  readonly id: string;
  readonly academicYearId: string;
  readonly name: string;
  readonly startsOn: IsoDate;
  readonly endsOn: IsoDate;
}

export interface SchoolClass extends CampusScoped {
  readonly id: string;
  readonly name: string;
  /** Sort order: Nursery = -2, LKG = -1, UKG = 0, Class 1 = 1 … Class 12 = 12. */
  readonly level: number;
}

export interface Section extends YearScoped {
  readonly id: string;
  readonly classId: string;
  readonly name: string;
  readonly classTeacherId: string | null;
  readonly capacity: number;
}

/** Administrative departments, used for users and staff. Academic departments are `AcademicUnit`s. */
export interface Department extends TenantScoped {
  readonly id: string;
  readonly name: string;
  readonly code: string;
}

export const SUBJECT_KINDS = ['core', 'language', 'elective', 'co-curricular'] as const;
export type SubjectKind = (typeof SUBJECT_KINDS)[number];

export interface Subject extends TenantScoped {
  readonly id: string;
  readonly name: string;
  readonly code: string;
  readonly kind: SubjectKind;
  /** Lowest and highest class level the subject is taught in (see `SchoolClass.level`). */
  readonly levelFrom: number;
  readonly levelTo: number;
  readonly departmentId: string | null;
}

// Academic structure ---------------------------------------------------------------------------------------------

export const ACADEMIC_UNIT_KINDS = [
  'exam',
  'grade',
  'stream',
  'combination',
  'subject',
  'faculty',
  'department',
  'programme',
  'semester',
  'course',
  'batch',
  'module',
  'schedule',
  'assessment',
] as const;
export type AcademicUnitKind = (typeof ACADEMIC_UNIT_KINDS)[number];

export const COURSE_TYPES = ['core', 'elective', 'practical', 'project', 'language'] as const;
export type CourseType = (typeof COURSE_TYPES)[number];

export const PROGRAMME_LEVELS = ['certificate', 'diploma', 'undergraduate', 'postgraduate', 'doctoral'] as const;
export type ProgrammeLevel = (typeof PROGRAMME_LEVELS)[number];

export const DURATION_UNITS = ['years', 'months', 'weeks'] as const;
export type DurationUnit = (typeof DURATION_UNITS)[number];

/**
 * One entry of an institution's academic structure: a junior-college stream, a degree programme, a university
 * faculty, a coaching batch and so on. Which kinds exist, how they nest and which attributes apply is defined per
 * institution type in `config/institution-types.ts`. Entries keep the type they were created for, so switching
 * institution type hides them without deleting them.
 */
export interface AcademicUnit extends TenantScoped {
  readonly id: string;
  readonly institutionType: InstitutionType;
  readonly kind: AcademicUnitKind;
  readonly parentId: string | null;
  readonly name: string;
  readonly code: string;
  /** The campus or college the entry belongs to; null for institution-wide entries. */
  readonly campusId: string | null;
  readonly status: 'active' | 'inactive';
  readonly durationValue: number | null;
  readonly durationUnit: DurationUnit | null;
  /** Number of terms or semesters in a programme. */
  readonly periods: number | null;
  readonly credits: number | null;
  readonly courseType: CourseType | null;
  readonly programmeLevel: ProgrammeLevel | null;
  readonly degree: string;
  readonly research: boolean;
  readonly practical: boolean;
  readonly capacity: number | null;
  readonly startsOn: IsoDate | null;
  readonly endsOn: IsoDate | null;
  readonly schedule: string;
  readonly maxMarks: number | null;
  /** Share of the final result, in percent. */
  readonly weightage: number | null;
  /** Subject entries that make up a combination. */
  readonly memberIds: readonly string[];
}

// Grading and assessment -----------------------------------------------------------------------------------------

export const GRADING_METHODS = ['marks', 'grades', 'gpa', 'cgpa'] as const;
export type GradingMethod = (typeof GRADING_METHODS)[number];

export const ASSESSMENT_KINDS = ['internal', 'external', 'practical', 'project'] as const;
export type AssessmentKind = (typeof ASSESSMENT_KINDS)[number];

export const ROUNDING_RULES = ['none', 'nearest', 'up'] as const;
export type RoundingRule = (typeof ROUNDING_RULES)[number];

export interface GradeBand {
  readonly id: string;
  readonly grade: string;
  readonly minPercent: number;
  readonly maxPercent: number;
  /** Null when grade points are not used. */
  readonly gradePoint: number | null;
  readonly remark: string;
  readonly isPass: boolean;
}

export interface AssessmentComponent {
  readonly id: string;
  readonly name: string;
  readonly kind: AssessmentKind;
  /** Percent of the final result. All components add up to 100. */
  readonly weightage: number;
}

export interface TranscriptSettings {
  readonly title: string;
  readonly showMarks: boolean;
  readonly showGrades: boolean;
  readonly showGradePoints: boolean;
  readonly showCredits: boolean;
  readonly showCumulative: boolean;
  readonly showRank: boolean;
  readonly footerNote: string;
}

/** Institution-wide grading rules. Boards and universities differ, so every value is configurable. */
export interface GradingConfig extends TenantScoped {
  readonly method: GradingMethod;
  readonly maxMarks: number;
  readonly passPercent: number;
  /** Minimum in each subject or course; may differ from the overall pass mark. */
  readonly subjectPassPercent: number;
  readonly passEachComponent: boolean;
  /** Top of the grade-point scale (4, 5 or 10) for GPA and CGPA. */
  readonly gradePointScale: number;
  /** Multiply CGPA by this to show an equivalent percentage; null hides the conversion. */
  readonly cgpaToPercent: number | null;
  readonly useCredits: boolean;
  readonly rounding: RoundingRule;
  readonly bands: readonly GradeBand[];
  readonly components: readonly AssessmentComponent[];
  readonly transcript: TranscriptSettings;
  readonly updatedAt: IsoDateTime | null;
  readonly updatedBy: string | null;
}

// Entitlements ----------------------------------------------------------------------------------------------------

export type EntitlementStatus = 'included' | 'add-on' | 'not-included';

/** What the subscription allows. Managed by Edulynk; read-only inside the institution. */
export interface FeatureEntitlement {
  readonly moduleId: ModuleId;
  readonly status: EntitlementStatus;
  /** A plan limit, for example "Up to 5 campuses". */
  readonly limit: string | null;
}

/** Figures for the institution summary panel. */
export interface InstitutionOverview {
  readonly campuses: number;
  readonly activeStudents: number;
  readonly staff: number;
  readonly currentYearLabel: string | null;
  /** Active structure entries of the current institution type, by kind. */
  readonly structure: Readonly<Partial<Record<AcademicUnitKind, number>>>;
  /** Classes (school structure), which live outside `AcademicUnit`. */
  readonly classes: number;
}
