import type {
  AssessmentComponent,
  GradeBand,
  GradingConfig,
  InstitutionType,
  TranscriptSettings,
} from '@/domain/institution';

/**
 * Starting points for grading, one per institution type. They are only templates: boards and universities differ, so
 * institutions edit every value on the Grading & Assessment tab.
 */

type BandSeed = readonly [grade: string, min: number, max: number, point: number | null, remark: string, pass: boolean];

const bands = (rows: readonly BandSeed[]): GradeBand[] =>
  rows.map(([grade, minPercent, maxPercent, gradePoint, remark, isPass], index) => ({
    id: `gbd_${index + 1}`,
    grade,
    minPercent,
    maxPercent,
    gradePoint,
    remark,
    isPass,
  }));

const components = (rows: readonly (readonly [string, AssessmentComponent['kind'], number])[]): AssessmentComponent[] =>
  rows.map(([name, kind, weightage], index) => ({ id: `asc_${index + 1}`, name, kind, weightage }));

const transcript = (overrides: Partial<TranscriptSettings>): TranscriptSettings => ({
  title: 'Statement of Marks',
  showMarks: true,
  showGrades: true,
  showGradePoints: false,
  showCredits: false,
  showCumulative: false,
  showRank: false,
  footerNote: '',
  ...overrides,
});

type GradingDefaults = Omit<GradingConfig, 'tenantId' | 'updatedAt' | 'updatedBy'>;

const SCHOOL: GradingDefaults = {
  method: 'grades',
  maxMarks: 100,
  passPercent: 33,
  subjectPassPercent: 33,
  passEachComponent: false,
  gradePointScale: 10,
  cgpaToPercent: null,
  useCredits: false,
  rounding: 'nearest',
  bands: bands([
    ['A1', 91, 100, 10, 'Outstanding', true],
    ['A2', 81, 90, 9, 'Excellent', true],
    ['B1', 71, 80, 8, 'Very good', true],
    ['B2', 61, 70, 7, 'Good', true],
    ['C1', 51, 60, 6, 'Above average', true],
    ['C2', 41, 50, 5, 'Average', true],
    ['D', 33, 40, 4, 'Pass', true],
    ['E', 0, 32, null, 'Needs improvement', false],
  ]),
  components: components([
    ['Periodic assessment', 'internal', 20],
    ['Term examination', 'external', 80],
  ]),
  transcript: transcript({ title: 'Report Card', showGradePoints: true }),
};

const JUNIOR_COLLEGE: GradingDefaults = {
  method: 'marks',
  maxMarks: 100,
  passPercent: 35,
  subjectPassPercent: 35,
  passEachComponent: true,
  gradePointScale: 10,
  cgpaToPercent: null,
  useCredits: false,
  rounding: 'none',
  bands: bands([
    ['Distinction', 75, 100, null, 'First class with distinction', true],
    ['First Class', 60, 74, null, '', true],
    ['Second Class', 50, 59, null, '', true],
    ['Pass', 35, 49, null, '', true],
    ['Fail', 0, 34, null, '', false],
  ]),
  components: components([
    ['Theory examination', 'external', 70],
    ['Practical examination', 'practical', 30],
  ]),
  transcript: transcript({ title: 'Memorandum of Marks' }),
};

const HIGHER_EDUCATION: GradingDefaults = {
  method: 'cgpa',
  maxMarks: 100,
  passPercent: 40,
  subjectPassPercent: 40,
  passEachComponent: false,
  gradePointScale: 10,
  cgpaToPercent: 9.5,
  useCredits: true,
  rounding: 'nearest',
  bands: bands([
    ['O', 90, 100, 10, 'Outstanding', true],
    ['A+', 80, 89, 9, 'Excellent', true],
    ['A', 70, 79, 8, 'Very good', true],
    ['B+', 60, 69, 7, 'Good', true],
    ['B', 50, 59, 6, 'Above average', true],
    ['C', 45, 49, 5, 'Average', true],
    ['P', 40, 44, 4, 'Pass', true],
    ['F', 0, 39, 0, 'Fail', false],
  ]),
  components: components([
    ['Continuous internal evaluation', 'internal', 30],
    ['Semester-end examination', 'external', 70],
  ]),
  transcript: transcript({
    title: 'Grade Card',
    showMarks: false,
    showGradePoints: true,
    showCredits: true,
    showCumulative: true,
  }),
};

const COACHING: GradingDefaults = {
  method: 'marks',
  maxMarks: 100,
  passPercent: 50,
  subjectPassPercent: 40,
  passEachComponent: false,
  gradePointScale: 10,
  cgpaToPercent: null,
  useCredits: false,
  rounding: 'nearest',
  bands: bands([
    ['Excellent', 85, 100, null, '', true],
    ['Good', 70, 84, null, '', true],
    ['Satisfactory', 50, 69, null, '', true],
    ['Needs improvement', 0, 49, null, 'Repeat recommended', false],
  ]),
  components: components([
    ['Weekly tests', 'internal', 40],
    ['Final assessment', 'external', 60],
  ]),
  transcript: transcript({ title: 'Course Completion Report', showRank: true }),
};

export const GRADING_DEFAULTS: Readonly<Record<InstitutionType, GradingDefaults>> = {
  school: SCHOOL,
  'junior-college': JUNIOR_COLLEGE,
  'degree-college': HIGHER_EDUCATION,
  university: HIGHER_EDUCATION,
  coaching: COACHING,
  other: COACHING,
};

/** A fresh copy of the defaults for a type, so callers can change it freely. */
export function gradingDefaultsFor(type: InstitutionType): GradingDefaults {
  return structuredClone(GRADING_DEFAULTS[type]);
}
