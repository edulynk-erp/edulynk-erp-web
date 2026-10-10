import {
  ACCREDITATIONS,
  ALL_CITIES,
  CLASS_LEVELS,
  COURSE_CATEGORIES,
  EDUCATION_BOARDS,
  INTERMEDIATE_BOARDS,
  LANGUAGES,
  MEDIUMS,
  stateOf,
  statesOf,
  TIMEZONES,
  UNIVERSITY_CATEGORIES,
} from '@/config/institution';
import { profileOf, type UnitField } from '@/config/institution-types';
import {
  ACADEMIC_UNIT_KINDS,
  ASSESSMENT_KINDS,
  COURSE_TYPES,
  DATE_FORMATS,
  DURATION_UNITS,
  GRADING_METHODS,
  INSTITUTION_CATEGORIES,
  INSTITUTION_TYPES,
  LOCATION_KINDS,
  PERIOD_TYPES,
  PROGRAMME_LEVELS,
  ROUNDING_RULES,
  SUBJECT_KINDS,
  TIME_FORMATS,
  WEEKDAYS,
  type GradingConfig,
  type Institution,
  type InstitutionType,
} from '@/domain/institution';
import { z } from '@/lib/validation/zod';

/**
 * Institution Setup validation, shared by the forms (instant feedback) and the service layer (the authority). The
 * institution API must apply the same rules when it exists.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const CODE = /^[A-Z0-9-]{2,12}$/;
const PIN_CODE = /^[1-9]\d{5}$/;
const UDISE = /^\d{11}$/;
const REFERENCE_NUMBER = /^[A-Za-z0-9/-]*$/;
const COLLEGE_CODE = /^[A-Za-z0-9-]{2,20}$/;
const UNIT_CODE = /^[A-Z0-9-]{1,16}$/;
const WEBSITE = /^https?:\/\/[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i;
/** PNG, JPEG or WebP only: SVG can carry script and is never accepted as a logo. */
const LOGO_DATA_URL = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/;
/** About 1 MB of image data once base64-encoded. */
export const MAX_LOGO_DATA_URL_LENGTH = 1_400_000;
export const MAX_LOGO_BYTES = 1_000_000;

function text(label: string, min: number, max: number) {
  return z
    .string()
    .trim()
    .min(min, min <= 1 ? `Enter ${label}.` : `${capitalise(label)} must be at least ${min} characters.`)
    .max(max, `${capitalise(label)} must be at most ${max} characters.`);
}

function capitalise(value: string): string {
  return value.replace(/^(a|an|the) /, '').replace(/^./, (first) => first.toUpperCase());
}

function email(label: string) {
  return z
    .string()
    .trim()
    .min(1, `Enter ${label}.`)
    .max(254)
    .email('Enter a valid email address, like name@school.edu.in.');
}

/** 10–13 digits, optionally with a leading + and spaces or hyphens between groups. */
export function isValidPhone(value: string): boolean {
  const compact = value.replace(/[\s-]/g, '');
  return /^\+?\d{10,13}$/.test(compact);
}

function phone(required: boolean) {
  return z
    .string()
    .trim()
    .max(20, 'Enter a valid phone number, like +91 98765 43210.')
    .refine((value) => (value === '' ? !required : isValidPhone(value)), {
      message: required
        ? 'Enter a valid phone number, like +91 98765 43210.'
        : 'Enter a valid phone number or leave it blank.',
    });
}

function whole(label: string, min: number, max: number) {
  return z
    .number({ error: `Enter ${label}.` })
    .int(`${capitalise(label)} must be a whole number.`)
    .min(min, `${capitalise(label)} must be at least ${min}.`)
    .max(max, `${capitalise(label)} must be at most ${max}.`);
}

function isoDate(label: string) {
  return z.string().regex(ISO_DATE, `Select ${label}.`);
}

export const policiesSchema = z
  .object({
    workingDays: z.array(z.enum(WEEKDAYS)).min(1, 'Select at least one working day.'),
    schoolStartsAt: z.string().regex(TIME, 'Enter a start time.'),
    schoolEndsAt: z.string().regex(TIME, 'Enter an end time.'),
    minimumAttendancePercent: whole('the minimum attendance', 50, 100),
    lateArrivalGraceMinutes: whole('the grace period', 0, 60),
    feeDueDay: whole('the fee due day', 1, 28),
    lateFeePerDay: whole('the late fee', 0, 10_000),
    dateFormat: z.enum(DATE_FORMATS, { error: 'Select a date format.' }),
    timeFormat: z.enum(TIME_FORMATS, { error: 'Select a time format.' }),
    timezone: z.string().refine((id) => TIMEZONES.some((zone) => zone.id === id), 'Select a time zone.'),
    languageId: z.string().refine((id) => LANGUAGES.some((language) => language.id === id), 'Select a language.'),
    notifyGuardiansOnAbsence: z.boolean(),
    sendFeeReminders: z.boolean(),
    publishResultsOnline: z.boolean(),
  })
  .refine((value) => value.schoolEndsAt > value.schoolStartsAt, {
    path: ['schoolEndsAt'],
    message: 'The day must end after it starts.',
  });

export const institutionBrandingSchema = z.object({
  displayName: text('a display name', 2, 60),
  tagline: z.string().trim().max(120, 'Tagline must be at most 120 characters.'),
  primaryColor: z.string().regex(HEX_COLOR, 'Enter a colour like #2563eb.'),
  accentColor: z.string().regex(HEX_COLOR, 'Enter a colour like #f59e0b.'),
  logoDataUrl: z
    .string()
    .max(MAX_LOGO_DATA_URL_LENGTH, 'The logo must be 1 MB or smaller.')
    .regex(LOGO_DATA_URL, 'Upload a PNG, JPG or WebP image.')
    .nullable(),
});

/**
 * Details for every institution type are kept (so switching type loses nothing) but only the selected type's details
 * are checked; the others are stored as entered. Only identifiers that apply to the selected type are required.
 */
const typeDetailsSchema = z.object({
  school: z.object({
    boardId: z.string(),
    affiliationNumber: z.string().trim().max(40),
    udiseCode: z.string().trim().max(20),
  }),
  'junior-college': z.object({
    boardId: z.string(),
    collegeCode: z.string().trim().max(40),
    affiliationNumber: z.string().trim().max(40),
  }),
  'degree-college': z.object({
    affiliatingUniversity: z.string().trim().max(120),
    collegeCode: z.string().trim().max(40),
    affiliationNumber: z.string().trim().max(40),
    autonomous: z.boolean(),
    accreditationId: z.string(),
  }),
  university: z.object({
    universityCategoryId: z.string(),
    recognitionDetails: z.string().trim().max(300),
    accreditationId: z.string(),
  }),
  coaching: z.object({
    courseCategoryIds: z.array(z.string()).max(COURSE_CATEGORIES.length),
    registrationNumber: z.string().trim().max(40),
  }),
  other: z.object({
    description: z.string().trim().max(300),
    registrationNumber: z.string().trim().max(40),
  }),
});
export type TypeDetailsInput = z.infer<typeof typeDetailsSchema>;

function validateTypeDetails(type: InstitutionType, details: TypeDetailsInput, issues: z.RefinementCtx): void {
  const fail = (field: string, message: string) =>
    issues.addIssue({ code: 'custom', path: ['typeDetails', type, field], message });
  const reference = (field: string, value: string, label: string) => {
    if (value && !REFERENCE_NUMBER.test(value)) fail(field, `${label}: use letters, digits, / or - only.`);
  };
  const optionalCode = (field: string, value: string) => {
    if (value && !COLLEGE_CODE.test(value)) fail(field, 'Use 2–20 letters, digits or hyphens.');
  };
  const optionalAccreditation = (value: string) => {
    if (value && !ACCREDITATIONS.some((option) => option.id === value)) {
      fail('accreditationId', 'Select an accreditation from the list or leave it blank.');
    }
  };
  switch (type) {
    case 'school': {
      const school = details.school;
      if (!EDUCATION_BOARDS.some((board) => board.id === school.boardId))
        fail('boardId', 'Select the education board.');
      reference('affiliationNumber', school.affiliationNumber, 'Affiliation number');
      if (school.udiseCode && !UDISE.test(school.udiseCode)) fail('udiseCode', 'UDISE code must be exactly 11 digits.');
      return;
    }
    case 'junior-college': {
      const college = details['junior-college'];
      if (!INTERMEDIATE_BOARDS.some((board) => board.id === college.boardId)) {
        fail('boardId', 'Select the intermediate board.');
      }
      optionalCode('collegeCode', college.collegeCode);
      reference('affiliationNumber', college.affiliationNumber, 'Affiliation number');
      return;
    }
    case 'degree-college': {
      const college = details['degree-college'];
      if (college.affiliatingUniversity.length < 3) fail('affiliatingUniversity', 'Enter the affiliating university.');
      optionalCode('collegeCode', college.collegeCode);
      reference('affiliationNumber', college.affiliationNumber, 'Affiliation number');
      optionalAccreditation(college.accreditationId);
      return;
    }
    case 'university': {
      const university = details.university;
      if (!UNIVERSITY_CATEGORIES.some((option) => option.id === university.universityCategoryId)) {
        fail('universityCategoryId', 'Select the university category.');
      }
      optionalAccreditation(university.accreditationId);
      return;
    }
    case 'coaching': {
      const coaching = details.coaching;
      const known = coaching.courseCategoryIds.filter((id) => COURSE_CATEGORIES.some((option) => option.id === id));
      if (known.length === 0 || known.length !== coaching.courseCategoryIds.length) {
        fail('courseCategoryIds', 'Select at least one course category.');
      }
      reference('registrationNumber', coaching.registrationNumber, 'Registration number');
      return;
    }
    case 'other': {
      const other = details.other;
      if (other.description.length < 5) fail('description', 'Describe the education you provide in a few words.');
      reference('registrationNumber', other.registrationNumber, 'Registration number');
      return;
    }
  }
}

export const institutionSettingsSchema = z
  .object({
    name: text('the institution name', 3, 120),
    shortName: text('a short name', 2, 20),
    type: z.enum(INSTITUTION_TYPES, { error: 'Select the institution type.' }),
    category: z.enum(INSTITUTION_CATEGORIES, { error: 'Select a category.' }),
    typeDetails: typeDetailsSchema,
    establishedYear: whole('the year established', 1800, new Date().getFullYear()),
    website: z
      .string()
      .trim()
      .max(200)
      .refine((value) => value === '' || WEBSITE.test(value), 'Enter a full web address, like https://school.edu.in.'),
    contactEmail: email('the official email'),
    studentCapacity: whole('the expected student capacity', 1, 100_000),
    mediumId: z
      .string()
      .refine((id) => MEDIUMS.some((medium) => medium.id === id), 'Select the medium of instruction.'),

    contactPerson: text('the primary contact person', 2, 80),
    contactDesignation: text('a designation', 2, 80),
    phone: phone(true),
    alternatePhone: phone(false),
    contactPersonEmail: email('the contact email'),
    supportEmail: email('the support email'),

    addressLine1: text('the address', 3, 120),
    addressLine2: z.string().trim().max(120, 'Address line 2 must be at most 120 characters.'),
    countryId: z.string().min(1, 'Select a country.'),
    stateId: z.string().min(1, 'Select a state.'),
    districtId: z.string().min(1, 'Select a district.'),
    cityId: z.string().min(1, 'Select a city.'),
    pinCode: z.string().trim().regex(PIN_CODE, 'PIN code must be 6 digits and cannot start with 0.'),

    policies: policiesSchema,
    branding: institutionBrandingSchema,
  })
  .superRefine((value, issues) => {
    validateTypeDetails(value.type, value.typeDetails, issues);
    if (value.countryId && !statesOf(value.countryId).length) {
      issues.addIssue({ code: 'custom', path: ['countryId'], message: 'Select a country from the list.' });
      return;
    }
    if (value.stateId && !statesOf(value.countryId).some((state) => state.id === value.stateId)) {
      issues.addIssue({ code: 'custom', path: ['stateId'], message: 'Select a state in the chosen country.' });
      return;
    }
    const state = stateOf(value.stateId);
    if (value.districtId && !state?.districts.some((district) => district.id === value.districtId)) {
      issues.addIssue({ code: 'custom', path: ['districtId'], message: 'Select a district in the chosen state.' });
    }
    if (value.cityId && !state?.cities.some((city) => city.id === value.cityId)) {
      issues.addIssue({ code: 'custom', path: ['cityId'], message: 'Select a city in the chosen state.' });
    }
  });
export type InstitutionSettingsInput = z.infer<typeof institutionSettingsSchema>;

/** The editable part of an institution record, in the shape the settings form and `updateInstitution` use. */
export function settingsOf(institution: Institution): InstitutionSettingsInput {
  return {
    name: institution.name,
    shortName: institution.shortName,
    type: institution.type,
    category: institution.category,
    typeDetails: {
      school: { ...institution.typeDetails.school },
      'junior-college': { ...institution.typeDetails['junior-college'] },
      'degree-college': { ...institution.typeDetails['degree-college'] },
      university: { ...institution.typeDetails.university },
      coaching: {
        ...institution.typeDetails.coaching,
        courseCategoryIds: [...institution.typeDetails.coaching.courseCategoryIds],
      },
      other: { ...institution.typeDetails.other },
    },
    establishedYear: institution.establishedYear,
    website: institution.website,
    contactEmail: institution.contactEmail,
    studentCapacity: institution.studentCapacity,
    mediumId: institution.mediumId,
    contactPerson: institution.contactPerson,
    contactDesignation: institution.contactDesignation,
    phone: institution.phone,
    alternatePhone: institution.alternatePhone,
    contactPersonEmail: institution.contactPersonEmail,
    supportEmail: institution.supportEmail,
    addressLine1: institution.addressLine1,
    addressLine2: institution.addressLine2,
    countryId: institution.countryId,
    stateId: institution.stateId,
    districtId: institution.districtId,
    cityId: institution.cityId,
    pinCode: institution.pinCode,
    policies: {
      workingDays: [...institution.policies.workingDays],
      schoolStartsAt: institution.policies.schoolStartsAt,
      schoolEndsAt: institution.policies.schoolEndsAt,
      minimumAttendancePercent: institution.policies.minimumAttendancePercent,
      lateArrivalGraceMinutes: institution.policies.lateArrivalGraceMinutes,
      feeDueDay: institution.policies.feeDueDay,
      lateFeePerDay: institution.policies.lateFeePerDay,
      dateFormat: institution.policies.dateFormat,
      timeFormat: institution.policies.timeFormat,
      timezone: institution.policies.timezone,
      languageId: institution.policies.languageId,
      notifyGuardiansOnAbsence: institution.policies.notifyGuardiansOnAbsence,
      sendFeeReminders: institution.policies.sendFeeReminders,
      publishResultsOnline: institution.policies.publishResultsOnline,
    },
    branding: { ...institution.branding },
  };
}

export const campusSchema = z.object({
  kind: z.enum(LOCATION_KINDS, { error: 'Select the location type.' }),
  name: text('the location name', 2, 80),
  code: z.string().trim().regex(CODE, 'Use 2–12 capital letters, digits or hyphens.'),
  address: text('the address', 5, 200),
  cityId: z.string().refine((id) => ALL_CITIES.some((city) => city.id === id), 'Select a city.'),
  pinCode: z.string().trim().regex(PIN_CODE, 'PIN code must be 6 digits and cannot start with 0.'),
  contactPerson: z.string().trim().max(80, 'Contact person must be at most 80 characters.'),
  phone: phone(true),
  email: email('the location email'),
  status: z.enum(['active', 'inactive']),
});
export type CampusInput = z.infer<typeof campusSchema>;

export const academicYearSchema = z
  .object({
    label: text('a label', 4, 20),
    startsOn: isoDate('a start date'),
    endsOn: isoDate('an end date'),
  })
  .refine((value) => value.endsOn > value.startsOn, { path: ['endsOn'], message: 'The year must end after it starts.' })
  .refine((value) => Date.parse(value.endsOn) - Date.parse(value.startsOn) <= 400 * 86_400_000, {
    path: ['endsOn'],
    message: 'An academic year can be at most 13 months long.',
  });
export type AcademicYearInput = z.infer<typeof academicYearSchema>;

export const classSchema = z.object({
  campusId: z.string().min(1, 'Select a campus.'),
  level: z
    .number({ error: 'Select a class level.' })
    .refine((value) => (CLASS_LEVELS as readonly number[]).includes(value), 'Select a class level.'),
  name: text('the class name', 1, 40),
});
export type ClassInput = z.infer<typeof classSchema>;

export const sectionSchema = z.object({
  classId: z.string().min(1, 'Select a class.'),
  name: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9 -]{1,10}$/, 'Use up to 10 letters, digits, spaces or hyphens.'),
  capacity: whole('the capacity', 1, 80),
});
export type SectionInput = z.infer<typeof sectionSchema>;

export const departmentSchema = z.object({
  name: text('the department name', 2, 80),
  code: z.string().trim().regex(CODE, 'Use 2–12 capital letters, digits or hyphens.'),
});
export type DepartmentInput = z.infer<typeof departmentSchema>;

export const subjectSchema = z
  .object({
    name: text('the subject name', 2, 80),
    code: z.string().trim().regex(CODE, 'Use 2–12 capital letters, digits or hyphens.'),
    kind: z.enum(SUBJECT_KINDS, { error: 'Select a subject type.' }),
    levelFrom: z.number({ error: 'Select the first class.' }),
    levelTo: z.number({ error: 'Select the last class.' }),
    /** Empty string means no department. */
    departmentId: z.string(),
  })
  .refine((value) => value.levelTo >= value.levelFrom, {
    path: ['levelTo'],
    message: 'The last class must not be before the first class.',
  });
export type SubjectInput = z.infer<typeof subjectSchema>;

export const calendarEventSchema = z
  .object({
    title: text('a title', 3, 120),
    kind: z.enum(['event', 'examination', 'holiday', 'meeting'], { error: 'Select a type.' }),
    startsOn: isoDate('a start date'),
    endsOn: isoDate('an end date'),
    campusId: z.string().min(1, 'Select a campus.'),
    audience: text('the audience', 2, 80),
  })
  .refine((value) => value.endsOn >= value.startsOn, {
    path: ['endsOn'],
    message: 'The end date must not be before the start date.',
  });
export type CalendarEventInput = z.infer<typeof calendarEventSchema>;

// Academic structure ---------------------------------------------------------------------------------------------

const optionalWhole = (label: string, min: number, max: number) => whole(label, min, max).nullable();
const optionalDate = (label: string) =>
  z.string().refine((value) => value === '' || ISO_DATE.test(value), `Select ${label} or leave it blank.`);

const academicUnitBase = z.object({
  kind: z.enum(ACADEMIC_UNIT_KINDS),
  /** Empty string means top level. */
  parentId: z.string(),
  name: text('a name', 2, 120),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .refine((value) => value === '' || UNIT_CODE.test(value), 'Use up to 16 capital letters, digits or hyphens.'),
  /** Empty string means institution-wide. */
  campusId: z.string(),
  status: z.enum(['active', 'inactive']),
  durationValue: optionalWhole('the duration', 1, 120),
  durationUnit: z.enum(DURATION_UNITS).nullable(),
  periods: optionalWhole('the number of terms or semesters', 1, 24),
  credits: z
    .number({ error: 'Enter the credits.' })
    .min(0, 'Credits cannot be negative.')
    .max(60, 'Credits must be at most 60.')
    .refine((value) => Number.isInteger(value * 2), 'Use whole or half credits.')
    .nullable(),
  courseType: z.enum(COURSE_TYPES).nullable(),
  programmeLevel: z.enum(PROGRAMME_LEVELS).nullable(),
  degree: z.string().trim().max(40, 'Degree must be at most 40 characters.'),
  research: z.boolean(),
  practical: z.boolean(),
  capacity: optionalWhole('the capacity', 1, 10_000),
  startsOn: optionalDate('a start date'),
  endsOn: optionalDate('an end date'),
  schedule: z.string().trim().max(120, 'Schedule must be at most 120 characters.'),
  maxMarks: optionalWhole('the maximum marks', 1, 1000),
  weightage: z
    .number({ error: 'Enter the weightage.' })
    .min(0, 'Weightage cannot be negative.')
    .max(100, 'Weightage must be at most 100%.')
    .nullable(),
  memberIds: z.array(z.string()).max(12, 'Choose at most 12 subjects.'),
});
export type AcademicUnitInput = z.infer<typeof academicUnitBase>;

/** A structure entry with nothing filled in. */
export const EMPTY_UNIT_INPUT: AcademicUnitInput = {
  kind: 'programme',
  parentId: '',
  name: '',
  code: '',
  campusId: '',
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
  startsOn: '',
  endsOn: '',
  schedule: '',
  maxMarks: null,
  weightage: null,
  memberIds: [],
};

const FIELD_REQUIRED: Record<
  UnitField,
  (input: AcademicUnitInput) => [field: keyof AcademicUnitInput, message: string] | null
> = {
  code: (input) => (input.code ? null : ['code', 'Enter a code.']),
  campus: (input) => (input.campusId ? null : ['campusId', 'Select a campus or location.']),
  duration: (input) =>
    input.durationValue === null || input.durationUnit === null ? ['durationValue', 'Enter the duration.'] : null,
  periods: (input) => (input.periods === null ? ['periods', 'Enter the number of terms or semesters.'] : null),
  credits: (input) => (input.credits === null ? ['credits', 'Enter the credits.'] : null),
  courseType: (input) => (input.courseType === null ? ['courseType', 'Select the course type.'] : null),
  programmeLevel: (input) => (input.programmeLevel === null ? ['programmeLevel', 'Select the level.'] : null),
  degree: (input) => (input.degree ? null : ['degree', 'Enter the degree, like B.Sc. or M.Tech.']),
  research: () => null,
  practical: () => null,
  capacity: (input) => (input.capacity === null ? ['capacity', 'Enter the capacity.'] : null),
  dates: (input) => (input.startsOn && input.endsOn ? null : ['startsOn', 'Select the start and end dates.']),
  schedule: (input) => (input.schedule ? null : ['schedule', 'Describe the schedule, like Mon–Fri 6–8 PM.']),
  marks: (input) => (input.maxMarks === null ? ['maxMarks', 'Enter the maximum marks.'] : null),
  weightage: (input) => (input.weightage === null ? ['weightage', 'Enter the weightage.'] : null),
  members: (input) => (input.memberIds.length >= 2 ? null : ['memberIds', 'Choose at least two subjects.']),
};

/** The structure-entry schema for one institution type: the level must exist and its required fields be filled. */
export function academicUnitSchemaFor(type: InstitutionType) {
  return academicUnitBase.superRefine((input, issues) => {
    const level = profileOf(type).levels.find((candidate) => candidate.kind === input.kind);
    if (!level) {
      issues.addIssue({ code: 'custom', path: ['kind'], message: 'This level is not used by the institution type.' });
      return;
    }
    if (level.parentRequired && !input.parentId) {
      issues.addIssue({ code: 'custom', path: ['parentId'], message: 'Select where this belongs.' });
    }
    for (const field of level.required) {
      const missing = FIELD_REQUIRED[field](input);
      if (missing) issues.addIssue({ code: 'custom', path: [missing[0]], message: missing[1] });
    }
    if (input.startsOn && input.endsOn && input.endsOn < input.startsOn) {
      issues.addIssue({ code: 'custom', path: ['endsOn'], message: 'The end date must not be before the start date.' });
    }
  });
}

export const structureSettingsSchema = z.object({
  labels: z.partialRecord(
    z.enum(ACADEMIC_UNIT_KINDS),
    z
      .string()
      .trim()
      .max(40, 'Names must be at most 40 characters.')
      .regex(/^[^<>{}]*$/, 'Names cannot contain < > { or }.'),
  ),
  periodType: z.enum(PERIOD_TYPES, { error: 'Select how the year is divided.' }),
  periodsPerYear: whole('the number of periods per year', 1, 6),
});
export type StructureSettingsInput = z.infer<typeof structureSettingsSchema>;

export const academicTermSchema = z
  .object({
    name: text('a name', 2, 40),
    startsOn: isoDate('a start date'),
    endsOn: isoDate('an end date'),
  })
  .refine((value) => value.endsOn > value.startsOn, { path: ['endsOn'], message: 'It must end after it starts.' });
export type AcademicTermInput = z.infer<typeof academicTermSchema>;

// Grading -----------------------------------------------------------------------------------------------------------

const percent = (label: string) => whole(label, 0, 100);

export const gradingConfigSchema = z
  .object({
    method: z.enum(GRADING_METHODS, { error: 'Select a grading method.' }),
    maxMarks: whole('the maximum marks', 10, 1000),
    passPercent: whole('the overall pass mark', 1, 100),
    subjectPassPercent: whole('the subject pass mark', 0, 100),
    passEachComponent: z.boolean(),
    gradePointScale: z
      .number({ error: 'Select the grade-point scale.' })
      .refine((value) => [4, 5, 10].includes(value), 'Select a 4, 5 or 10-point scale.'),
    cgpaToPercent: z
      .number({ error: 'Enter a multiplier or leave it blank.' })
      .min(1, 'The multiplier must be at least 1.')
      .max(25, 'The multiplier must be at most 25.')
      .nullable(),
    useCredits: z.boolean(),
    rounding: z.enum(ROUNDING_RULES),
    bands: z
      .array(
        z.object({
          id: z.string().min(1),
          grade: text('a grade', 1, 20),
          minPercent: percent('the lowest percentage'),
          maxPercent: percent('the highest percentage'),
          gradePoint: z
            .number({ error: 'Enter a grade point.' })
            .min(0, 'Grade points cannot be negative.')
            .max(10, 'Grade points must be at most 10.')
            .nullable(),
          remark: z.string().trim().max(60, 'Remarks must be at most 60 characters.'),
          isPass: z.boolean(),
        }),
      )
      .min(2, 'Add at least two grade bands.')
      .max(20, 'Use at most 20 grade bands.'),
    components: z
      .array(
        z.object({
          id: z.string().min(1),
          name: text('a component name', 2, 60),
          kind: z.enum(ASSESSMENT_KINDS),
          weightage: whole('the weightage', 1, 100),
        }),
      )
      .min(1, 'Add at least one assessment component.')
      .max(10, 'Use at most 10 components.'),
    transcript: z.object({
      title: text('a transcript title', 3, 60),
      showMarks: z.boolean(),
      showGrades: z.boolean(),
      showGradePoints: z.boolean(),
      showCredits: z.boolean(),
      showCumulative: z.boolean(),
      showRank: z.boolean(),
      footerNote: z.string().trim().max(200, 'The footer note must be at most 200 characters.'),
    }),
  })
  .superRefine((value, issues) => {
    const add = (path: (string | number)[], message: string) => issues.addIssue({ code: 'custom', path, message });
    const seen = new Map<string, number>();
    value.bands.forEach((band, index) => {
      if (band.minPercent > band.maxPercent) add(['bands', index, 'maxPercent'], 'Must not be below the lowest %.');
      const key = band.grade.trim().toLowerCase();
      if (seen.has(key)) add(['bands', index, 'grade'], 'Each grade must be unique.');
      seen.set(key, index);
      if ((value.method === 'gpa' || value.method === 'cgpa') && band.gradePoint === null) {
        add(['bands', index, 'gradePoint'], 'Enter a grade point for GPA or CGPA.');
      }
      if (band.gradePoint !== null && band.gradePoint > value.gradePointScale) {
        add(['bands', index, 'gradePoint'], `Must not exceed the ${value.gradePointScale}-point scale.`);
      }
    });
    const ordered = value.bands
      .map((band, index) => ({ band, index }))
      .sort((a, b) => a.band.minPercent - b.band.minPercent);
    if (ordered[0] && ordered[0].band.minPercent !== 0) {
      add(['bands', ordered[0].index, 'minPercent'], 'The lowest band must start at 0%.');
    }
    const top = ordered.at(-1);
    if (top && top.band.maxPercent !== 100)
      add(['bands', top.index, 'maxPercent'], 'The highest band must end at 100%.');
    for (let i = 1; i < ordered.length; i += 1) {
      const previous = ordered[i - 1]!.band;
      const current = ordered[i]!;
      if (current.band.minPercent <= previous.maxPercent) {
        add(['bands', current.index, 'minPercent'], `Overlaps grade ${previous.grade}.`);
      } else if (current.band.minPercent > previous.maxPercent + 1) {
        add(['bands', current.index, 'minPercent'], `Leaves a gap after grade ${previous.grade}.`);
      }
    }
    if (!value.bands.some((band) => band.isPass)) add(['bands'], 'Mark at least one band as a pass.');
    const total = value.components.reduce((sum, component) => sum + component.weightage, 0);
    if (total !== 100) add(['components'], `Component weightages add up to ${total}%; they must total 100%.`);
    const names = new Set<string>();
    value.components.forEach((component, index) => {
      const key = component.name.trim().toLowerCase();
      if (names.has(key)) add(['components', index, 'name'], 'Each component name must be unique.');
      names.add(key);
    });
  });
export type GradingConfigInput = z.infer<typeof gradingConfigSchema>;

/** The editable part of the grading configuration, in the shape the grading form and service use. */
export function gradingInputOf(
  config: Omit<GradingConfig, 'tenantId' | 'updatedAt' | 'updatedBy'>,
): GradingConfigInput {
  return {
    method: config.method,
    maxMarks: config.maxMarks,
    passPercent: config.passPercent,
    subjectPassPercent: config.subjectPassPercent,
    passEachComponent: config.passEachComponent,
    gradePointScale: config.gradePointScale,
    cgpaToPercent: config.cgpaToPercent,
    useCredits: config.useCredits,
    rounding: config.rounding,
    bands: config.bands.map((band) => ({ ...band })),
    components: config.components.map((component) => ({ ...component })),
    transcript: { ...config.transcript },
  };
}

/** Flattens zod issues into `{ 'policies.feeDueDay': 'message' }`, first message per field. */
export function toFieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || 'form';
    errors[key] ??= issue.message;
  }
  return errors;
}
