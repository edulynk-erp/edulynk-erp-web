import type { CalendarEvent } from '@/domain/communication';
import type {
  AcademicTerm,
  AcademicUnit,
  AcademicYear,
  Campus,
  Department,
  FeatureEntitlement,
  GradingConfig,
  Institution,
  InstitutionOverview,
  InstitutionType,
  SchoolClass,
  Section,
  Subject,
} from '@/domain/institution';
import type {
  AcademicTermInput,
  AcademicUnitInput,
  AcademicYearInput,
  CalendarEventInput,
  CampusInput,
  ClassInput,
  DepartmentInput,
  GradingConfigInput,
  InstitutionSettingsInput,
  SectionInput,
  StructureSettingsInput,
  SubjectInput,
} from '@/lib/validation/institution';

export interface SectionSummary extends Section {
  readonly enrolled: number;
}

/**
 * Institution Setup. Writes require the signed-in principal's `institution` grants (create, edit, delete; approve to
 * change the institution type or the current academic year) and are validated with the shared schemas in
 * `lib/validation/institution.ts`. Institution-wide records also require access to every campus; campus records
 * require access to that campus. Failures are reported as `ServiceError` (`FORBIDDEN`, `VALIDATION`, `CONFLICT`,
 * `NOT_FOUND`).
 */
export interface InstitutionService {
  getInstitution(): Promise<Institution>;
  getOverview(): Promise<InstitutionOverview>;
  /**
   * Saves the profile, type details, contact details, address, policies and branding in one step. Changing the type
   * requires `institution:approve`; details and structure of other types are kept.
   */
  updateInstitution(input: InstitutionSettingsInput): Promise<Institution>;
  /** Naming and term/semester pattern for one institution type's structure. */
  updateStructureSettings(type: InstitutionType, input: StructureSettingsInput): Promise<Institution>;

  /** Structure entries of every type; screens show the current type's and report how many others are kept. */
  listAcademicUnits(): Promise<readonly AcademicUnit[]>;
  /** Creates an entry for the current institution type. */
  createAcademicUnit(input: AcademicUnitInput): Promise<AcademicUnit>;
  updateAcademicUnit(id: string, input: AcademicUnitInput): Promise<AcademicUnit>;
  /** Refused while other entries sit under it or a combination uses it. */
  deleteAcademicUnit(id: string): Promise<void>;
  /** Loads a starter structure for the current type when it has none. Returns how many entries were created. */
  applyStructureTemplate(): Promise<number>;

  /** Terms or semesters of an academic year, earliest first. */
  listAcademicTerms(academicYearId: string): Promise<readonly AcademicTerm[]>;
  createAcademicTerm(academicYearId: string, input: AcademicTermInput): Promise<AcademicTerm>;
  updateAcademicTerm(id: string, input: AcademicTermInput): Promise<AcademicTerm>;
  deleteAcademicTerm(id: string): Promise<void>;

  getGradingConfig(): Promise<GradingConfig>;
  updateGradingConfig(input: GradingConfigInput): Promise<GradingConfig>;

  /** The subscription's feature entitlements. Read-only: plans are changed by Edulynk, never from the institution. */
  listEntitlements(): Promise<readonly FeatureEntitlement[]>;

  listCampuses(): Promise<readonly Campus[]>;
  createCampus(input: CampusInput): Promise<Campus>;
  updateCampus(id: string, input: CampusInput): Promise<Campus>;
  deleteCampus(id: string): Promise<void>;

  /** Newest first. */
  listAcademicYears(): Promise<readonly AcademicYear[]>;
  createAcademicYear(input: AcademicYearInput): Promise<AcademicYear>;
  updateAcademicYear(id: string, input: AcademicYearInput): Promise<AcademicYear>;
  /** Makes a planned year current and closes the previous one. Requires `institution:approve`. */
  setCurrentAcademicYear(id: string): Promise<AcademicYear>;
  deleteAcademicYear(id: string): Promise<void>;

  listClasses(): Promise<readonly SchoolClass[]>;
  createClass(input: ClassInput): Promise<SchoolClass>;
  updateClass(id: string, input: ClassInput): Promise<SchoolClass>;
  deleteClass(id: string): Promise<void>;

  /** Sections of the year with their current enrolment, in class order. */
  listSections(academicYearId: string): Promise<readonly SectionSummary[]>;
  createSection(academicYearId: string, input: SectionInput): Promise<Section>;
  updateSection(id: string, input: SectionInput): Promise<Section>;
  deleteSection(id: string): Promise<void>;

  listDepartments(): Promise<readonly Department[]>;
  createDepartment(input: DepartmentInput): Promise<Department>;
  updateDepartment(id: string, input: DepartmentInput): Promise<Department>;
  deleteDepartment(id: string): Promise<void>;

  listSubjects(): Promise<readonly Subject[]>;
  createSubject(input: SubjectInput): Promise<Subject>;
  updateSubject(id: string, input: SubjectInput): Promise<Subject>;
  deleteSubject(id: string): Promise<void>;

  /** Events overlapping the academic year, earliest first. */
  listCalendarEvents(academicYearId: string): Promise<readonly CalendarEvent[]>;
  createCalendarEvent(input: CalendarEventInput): Promise<CalendarEvent>;
  updateCalendarEvent(id: string, input: CalendarEventInput): Promise<CalendarEvent>;
  deleteCalendarEvent(id: string): Promise<void>;
}
