import type { AcademicUnitKind, InstitutionType } from '@/domain/institution';
import type { AcademicUnitInput } from '@/lib/validation/institution';

/**
 * DEMO FIXTURE. Starter academic structures an institution can load when its type has no structure yet. Entries are
 * created through the normal service rules, then edited like any other entry. `parent` refers to another template
 * entry's `ref`; `members` to subject refs.
 */
export interface TemplateEntry {
  readonly ref: string;
  readonly parent?: string;
  readonly members?: readonly string[];
  readonly values: Partial<AcademicUnitInput> & { readonly kind: AcademicUnitKind; readonly name: string };
}

const subject = (ref: string, name: string, code: string, practical = false): TemplateEntry => ({
  ref,
  values: { kind: 'subject', name, code, courseType: 'core', practical, maxMarks: practical ? 70 : 100 },
});

export const STRUCTURE_TEMPLATES: Readonly<Partial<Record<InstitutionType, readonly TemplateEntry[]>>> = {
  'junior-college': [
    { ref: 'y1', values: { kind: 'grade', name: 'First Year', code: 'IPE-1' } },
    { ref: 'y2', values: { kind: 'grade', name: 'Second Year', code: 'IPE-2' } },
    { ref: 'mpc', values: { kind: 'stream', name: 'MPC (Maths, Physics, Chemistry)', code: 'MPC', capacity: 120 } },
    { ref: 'bipc', values: { kind: 'stream', name: 'BiPC (Biology, Physics, Chemistry)', code: 'BIPC', capacity: 80 } },
    { ref: 'cec', values: { kind: 'stream', name: 'CEC (Civics, Economics, Commerce)', code: 'CEC', capacity: 60 } },
    subject('eng', 'English', 'ENG'),
    subject('mat', 'Mathematics', 'MAT'),
    subject('phy', 'Physics', 'PHY', true),
    subject('che', 'Chemistry', 'CHE', true),
    subject('bot', 'Botany', 'BOT', true),
    subject('zoo', 'Zoology', 'ZOO', true),
    subject('civ', 'Civics', 'CIV'),
    subject('eco', 'Economics', 'ECO'),
    subject('com', 'Commerce', 'COM'),
    {
      ref: 'c-mpc',
      parent: 'mpc',
      members: ['eng', 'mat', 'phy', 'che'],
      values: { kind: 'combination', name: 'MPC core', code: 'MPC-C' },
    },
    {
      ref: 'c-bipc',
      parent: 'bipc',
      members: ['eng', 'bot', 'zoo', 'phy', 'che'],
      values: { kind: 'combination', name: 'BiPC core', code: 'BIPC-C' },
    },
    {
      ref: 'c-cec',
      parent: 'cec',
      members: ['eng', 'civ', 'eco', 'com'],
      values: { kind: 'combination', name: 'CEC core', code: 'CEC-C' },
    },
    {
      ref: 'e1',
      parent: 'y1',
      values: { kind: 'exam', name: 'Quarterly Examination', code: 'QE-1', maxMarks: 100, weightage: 10 },
    },
    {
      ref: 'e2',
      parent: 'y1',
      values: { kind: 'exam', name: 'Half-Yearly Examination', code: 'HY-1', maxMarks: 100, weightage: 20 },
    },
    {
      ref: 'e3',
      parent: 'y2',
      values: { kind: 'exam', name: 'Pre-Final Examination', code: 'PF-2', maxMarks: 100, weightage: 20 },
    },
  ],
  'degree-college': [
    { ref: 'dsc', values: { kind: 'department', name: 'Department of Computer Science', code: 'CS' } },
    { ref: 'dcom', values: { kind: 'department', name: 'Department of Commerce', code: 'COM' } },
    {
      ref: 'bsc',
      parent: 'dsc',
      values: {
        kind: 'programme',
        name: 'B.Sc. Computer Science',
        code: 'BSC-CS',
        degree: 'B.Sc.',
        programmeLevel: 'undergraduate',
        durationValue: 3,
        durationUnit: 'years',
        periods: 6,
        capacity: 60,
      },
    },
    {
      ref: 'bcom',
      parent: 'dcom',
      values: {
        kind: 'programme',
        name: 'B.Com. (General)',
        code: 'BCOM',
        degree: 'B.Com.',
        programmeLevel: 'undergraduate',
        durationValue: 3,
        durationUnit: 'years',
        periods: 6,
        capacity: 120,
      },
    },
    { ref: 's1', parent: 'bsc', values: { kind: 'semester', name: 'Semester 1', code: 'BSC-S1' } },
    { ref: 's2', parent: 'bsc', values: { kind: 'semester', name: 'Semester 2', code: 'BSC-S2' } },
    {
      ref: 'k1',
      parent: 's1',
      values: {
        kind: 'course',
        name: 'Programming in C',
        code: 'CS101',
        courseType: 'core',
        credits: 4,
        maxMarks: 100,
      },
    },
    {
      ref: 'k2',
      parent: 's1',
      values: {
        kind: 'course',
        name: 'C Programming Lab',
        code: 'CS101L',
        courseType: 'practical',
        credits: 2,
        practical: true,
        maxMarks: 50,
      },
    },
    {
      ref: 'k3',
      parent: 's2',
      values: { kind: 'course', name: 'Data Structures', code: 'CS201', courseType: 'core', credits: 4, maxMarks: 100 },
    },
    {
      ref: 'k4',
      parent: 's2',
      values: {
        kind: 'course',
        name: 'Environmental Studies',
        code: 'AE201',
        courseType: 'elective',
        credits: 2,
        maxMarks: 50,
      },
    },
  ],
  university: [
    { ref: 'fe', values: { kind: 'faculty', name: 'Faculty of Engineering & Technology', code: 'FET' } },
    { ref: 'fs', values: { kind: 'faculty', name: 'Faculty of Science', code: 'FSC' } },
    { ref: 'dcse', parent: 'fe', values: { kind: 'department', name: 'Computer Science & Engineering', code: 'CSE' } },
    { ref: 'dphy', parent: 'fs', values: { kind: 'department', name: 'Physics', code: 'PHY' } },
    {
      ref: 'btech',
      parent: 'dcse',
      values: {
        kind: 'programme',
        name: 'B.Tech. Computer Science & Engineering',
        code: 'BT-CSE',
        degree: 'B.Tech.',
        programmeLevel: 'undergraduate',
        durationValue: 4,
        durationUnit: 'years',
        periods: 8,
        capacity: 180,
      },
    },
    {
      ref: 'phd',
      parent: 'dphy',
      values: {
        kind: 'programme',
        name: 'Ph.D. Physics',
        code: 'PHD-PHY',
        degree: 'Ph.D.',
        programmeLevel: 'doctoral',
        durationValue: 5,
        durationUnit: 'years',
        periods: 10,
        research: true,
        capacity: 12,
      },
    },
    { ref: 's1', parent: 'btech', values: { kind: 'semester', name: 'Semester 1', code: 'BT-S1' } },
    {
      ref: 'c1',
      parent: 's1',
      values: {
        kind: 'course',
        name: 'Engineering Mathematics I',
        code: 'MA101',
        courseType: 'core',
        credits: 4,
        maxMarks: 100,
      },
    },
    {
      ref: 'c2',
      parent: 's1',
      values: {
        kind: 'course',
        name: 'Programming for Problem Solving',
        code: 'CS101',
        courseType: 'core',
        credits: 3,
        maxMarks: 100,
      },
    },
    {
      ref: 'c3',
      parent: 's1',
      values: {
        kind: 'course',
        name: 'Engineering Workshop',
        code: 'ME101L',
        courseType: 'practical',
        credits: 1.5,
        practical: true,
        maxMarks: 50,
      },
    },
  ],
  coaching: [
    {
      ref: 'jee',
      values: {
        kind: 'course',
        name: 'JEE Main & Advanced (2-year)',
        code: 'JEE-2Y',
        durationValue: 24,
        durationUnit: 'months',
      },
    },
    {
      ref: 'neet',
      values: { kind: 'course', name: 'NEET Foundation', code: 'NEET-1Y', durationValue: 12, durationUnit: 'months' },
    },
    { ref: 'b1', parent: 'jee', values: { kind: 'batch', name: 'JEE Morning Batch A', code: 'JEE-MA', capacity: 40 } },
    { ref: 'b2', parent: 'neet', values: { kind: 'batch', name: 'NEET Evening Batch', code: 'NEET-EV', capacity: 35 } },
    { ref: 'm1', parent: 'jee', values: { kind: 'module', name: 'Physics – Mechanics', code: 'PHY-M1' } },
    { ref: 'm2', parent: 'jee', values: { kind: 'module', name: 'Mathematics – Calculus', code: 'MAT-M1' } },
    {
      ref: 'sc1',
      parent: 'b1',
      values: { kind: 'schedule', name: 'Weekday mornings', schedule: 'Mon–Sat, 6:30–9:30 AM' },
    },
    {
      ref: 'a1',
      parent: 'jee',
      values: { kind: 'assessment', name: 'Monthly Mock Test', code: 'MOCK', maxMarks: 300, weightage: 40 },
    },
  ],
  other: [
    {
      ref: 'p1',
      values: {
        kind: 'programme',
        name: 'Certificate Programme',
        code: 'CERT',
        durationValue: 6,
        durationUnit: 'months',
      },
    },
    {
      ref: 'g1',
      parent: 'p1',
      values: { kind: 'batch', name: 'Weekend Group', code: 'WKND', capacity: 25, schedule: 'Sat–Sun, 10 AM–1 PM' },
    },
    { ref: 'm1', parent: 'p1', values: { kind: 'module', name: 'Foundations', code: 'MOD-1' } },
  ],
};
