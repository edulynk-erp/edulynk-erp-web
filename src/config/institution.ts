import type { CalendarEvent } from '@/domain/communication';
import type {
  AssessmentKind,
  CourseType,
  DurationUnit,
  GradingMethod,
  InstitutionCategory,
  ProgrammeLevel,
  RoundingRule,
  SubjectKind,
  Weekday,
} from '@/domain/institution';

/** Option lists for the Institution Setup forms. Mock reference data until the institution API provides it. */

export { INSTITUTION_TYPE_LABELS } from '@/config/institution-types';

/** A reference-data entry. Records store the `id`; screens look up the `name` for display. */
export interface ReferenceOption {
  readonly id: string;
  readonly name: string;
}

export const EDUCATION_BOARDS: readonly (ReferenceOption & { readonly shortName: string })[] = [
  { id: 'brd_cbse', name: 'CBSE (Central Board of Secondary Education)', shortName: 'CBSE' },
  { id: 'brd_cisce', name: 'ICSE / ISC (CISCE)', shortName: 'ICSE' },
  { id: 'brd_state', name: 'State Board', shortName: 'State Board' },
  { id: 'brd_ib', name: 'IB (International Baccalaureate)', shortName: 'IB' },
  { id: 'brd_caie', name: 'Cambridge (CAIE)', shortName: 'Cambridge' },
  { id: 'brd_nios', name: 'NIOS', shortName: 'NIOS' },
];

/** Boards that conduct intermediate (Class 11–12) examinations. */
export const INTERMEDIATE_BOARDS: readonly (ReferenceOption & { readonly shortName: string })[] = [
  { id: 'ibd_tsbie', name: 'Telangana State Board of Intermediate Education (TSBIE)', shortName: 'TSBIE' },
  { id: 'ibd_bieap', name: 'Board of Intermediate Education, Andhra Pradesh (BIEAP)', shortName: 'BIEAP' },
  { id: 'ibd_cbse', name: 'CBSE (Senior Secondary)', shortName: 'CBSE' },
  { id: 'ibd_cisce', name: 'ISC (CISCE)', shortName: 'ISC' },
  { id: 'ibd_state', name: 'Other State Higher Secondary Board', shortName: 'State Board' },
  { id: 'ibd_nios', name: 'NIOS (Senior Secondary)', shortName: 'NIOS' },
];

export const UNIVERSITY_CATEGORIES: readonly ReferenceOption[] = [
  { id: 'unc_central', name: 'Central University' },
  { id: 'unc_state', name: 'State University' },
  { id: 'unc_state_private', name: 'State Private University' },
  { id: 'unc_deemed', name: 'Deemed to be University' },
  { id: 'unc_ini', name: 'Institution of National Importance' },
  { id: 'unc_open', name: 'Open University' },
  { id: 'unc_foreign', name: 'Foreign University Campus' },
];

/** Accreditation grades. Optional everywhere: not every institution is accredited. */
export const ACCREDITATIONS: readonly ReferenceOption[] = [
  { id: 'acc_naac_app', name: 'NAAC A++' },
  { id: 'acc_naac_ap', name: 'NAAC A+' },
  { id: 'acc_naac_a', name: 'NAAC A' },
  { id: 'acc_naac_bpp', name: 'NAAC B++' },
  { id: 'acc_naac_bp', name: 'NAAC B+' },
  { id: 'acc_naac_b', name: 'NAAC B' },
  { id: 'acc_naac_c', name: 'NAAC C' },
  { id: 'acc_nba', name: 'NBA accredited programmes' },
  { id: 'acc_other', name: 'Other accreditation' },
];

export const COURSE_CATEGORIES: readonly ReferenceOption[] = [
  { id: 'crs_engineering_entrance', name: 'Engineering entrance' },
  { id: 'crs_medical_entrance', name: 'Medical entrance' },
  { id: 'crs_civil_services', name: 'Civil services' },
  { id: 'crs_banking_ssc', name: 'Banking & SSC' },
  { id: 'crs_foundation', name: 'School foundation' },
  { id: 'crs_languages', name: 'Languages' },
  { id: 'crs_it_skills', name: 'IT & software skills' },
  { id: 'crs_vocational', name: 'Vocational training' },
  { id: 'crs_professional', name: 'Professional certification' },
];

export const TIMEZONES: readonly ReferenceOption[] = [
  { id: 'Asia/Kolkata', name: 'India Standard Time (Asia/Kolkata)' },
  { id: 'Asia/Dubai', name: 'Gulf Standard Time (Asia/Dubai)' },
  { id: 'Asia/Singapore', name: 'Singapore Time (Asia/Singapore)' },
  { id: 'Europe/London', name: 'UK Time (Europe/London)' },
  { id: 'America/New_York', name: 'US Eastern Time (America/New_York)' },
];

export const LANGUAGES: readonly ReferenceOption[] = [
  { id: 'lng_en', name: 'English' },
  { id: 'lng_hi', name: 'Hindi' },
  { id: 'lng_te', name: 'Telugu' },
  { id: 'lng_ta', name: 'Tamil' },
  { id: 'lng_kn', name: 'Kannada' },
  { id: 'lng_mr', name: 'Marathi' },
];

export const MEDIUMS: readonly ReferenceOption[] = [
  { id: 'med_english', name: 'English' },
  { id: 'med_hindi', name: 'Hindi' },
  { id: 'med_telugu', name: 'Telugu' },
  { id: 'med_tamil', name: 'Tamil' },
  { id: 'med_kannada', name: 'Kannada' },
  { id: 'med_marathi', name: 'Marathi' },
  { id: 'med_bilingual', name: 'Bilingual' },
];

/** Display name for a reference-data ID, or a dash when the ID is unknown. */
export function nameOf(options: readonly ReferenceOption[], id: string | null | undefined): string {
  return options.find((option) => option.id === id)?.name ?? '—';
}

export const INSTITUTION_CATEGORY_LABELS: Record<InstitutionCategory, string> = {
  'private-unaided': 'Private (unaided)',
  'private-aided': 'Private (aided)',
  government: 'Government',
  autonomous: 'Autonomous',
  deemed: 'Deemed',
  'trust-society': 'Trust / Society',
  other: 'Other',
};

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun',
};

export const GRADING_METHOD_LABELS: Record<GradingMethod, string> = {
  marks: 'Marks / percentage',
  grades: 'Letter grades',
  gpa: 'GPA (per term or semester)',
  cgpa: 'CGPA (cumulative, credit-weighted)',
};

export const ROUNDING_LABELS: Record<RoundingRule, string> = {
  none: 'No rounding',
  nearest: 'Round to nearest',
  up: 'Always round up',
};

export const ASSESSMENT_KIND_LABELS: Record<AssessmentKind, string> = {
  internal: 'Internal',
  external: 'External',
  practical: 'Practical',
  project: 'Project / viva',
};

export const COURSE_TYPE_LABELS: Record<CourseType, string> = {
  core: 'Core',
  elective: 'Elective',
  practical: 'Practical / lab',
  project: 'Project',
  language: 'Language',
};

export const PROGRAMME_LEVEL_LABELS: Record<ProgrammeLevel, string> = {
  certificate: 'Certificate',
  diploma: 'Diploma',
  undergraduate: 'Undergraduate',
  postgraduate: 'Postgraduate',
  doctoral: 'Doctoral / research',
};

export const DURATION_UNIT_LABELS: Record<DurationUnit, string> = {
  years: 'Years',
  months: 'Months',
  weeks: 'Weeks',
};

export const SUBJECT_KIND_LABELS: Record<SubjectKind, string> = {
  core: 'Core',
  language: 'Language',
  elective: 'Elective',
  'co-curricular': 'Co-curricular',
};

export const EVENT_KIND_LABELS: Record<CalendarEvent['kind'], string> = {
  event: 'Event',
  examination: 'Examination',
  holiday: 'Holiday',
  meeting: 'Meeting',
};

/** Nursery = -2, LKG = -1, UKG = 0, Class 1 … Class 12. */
export const CLASS_LEVELS = [-2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

export function classLevelName(level: number): string {
  if (level === -2) return 'Nursery';
  if (level === -1) return 'LKG';
  if (level === 0) return 'UKG';
  return `Class ${level}`;
}

export interface StateLocations extends ReferenceOption {
  readonly districts: readonly ReferenceOption[];
  readonly cities: readonly ReferenceOption[];
}

export interface CountryLocations extends ReferenceOption {
  readonly states: readonly StateLocations[];
}

const place = (prefix: string, stateCode: string, names: readonly string[]): ReferenceOption[] =>
  names.map((name) => ({
    id: `${prefix}_${stateCode}_${name
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')}`,
    name,
  }));

const state = (code: string, name: string, districts: readonly string[], cities: readonly string[]) => ({
  id: `st_in_${code}`,
  name,
  districts: place('dst', code, districts),
  cities: place('cit', code, cities),
});

/** Mock location reference data: country → state → districts and cities, each with a stable ID. */
export const COUNTRIES: readonly CountryLocations[] = [
  {
    id: 'cn_in',
    name: 'India',
    states: [
      state(
        'ap',
        'Andhra Pradesh',
        ['Visakhapatnam', 'Krishna', 'Guntur', 'Tirupati'],
        ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Tirupati'],
      ),
      state('dl', 'Delhi', ['New Delhi', 'South Delhi', 'North West Delhi'], ['New Delhi', 'Delhi']),
      state('ka', 'Karnataka', ['Bengaluru Urban', 'Mysuru', 'Dakshina Kannada'], ['Bengaluru', 'Mysuru', 'Mangaluru']),
      state('mh', 'Maharashtra', ['Mumbai Suburban', 'Pune', 'Nagpur'], ['Mumbai', 'Pune', 'Nagpur']),
      state('tn', 'Tamil Nadu', ['Chennai', 'Coimbatore', 'Madurai'], ['Chennai', 'Coimbatore', 'Madurai']),
      state(
        'tg',
        'Telangana',
        ['Hyderabad', 'Rangareddy', 'Medchal–Malkajgiri', 'Warangal'],
        ['Hyderabad', 'Secunderabad', 'Warangal'],
      ),
    ],
  },
];

export function statesOf(countryId: string): readonly StateLocations[] {
  return COUNTRIES.find((country) => country.id === countryId)?.states ?? [];
}

export function stateOf(stateId: string): StateLocations | undefined {
  return COUNTRIES.flatMap((country) => country.states).find((candidate) => candidate.id === stateId);
}

/** Every city, with its state, for city pickers that are not tied to a chosen state. */
export const ALL_CITIES: readonly (ReferenceOption & { readonly stateName: string })[] = COUNTRIES.flatMap((country) =>
  country.states.flatMap((entry) => entry.cities.map((city) => ({ ...city, stateName: entry.name }))),
);

export function cityName(cityId: string | null | undefined): string {
  return nameOf(ALL_CITIES, cityId);
}

/** Display names for an address's location IDs. */
export function locationNames(ids: { countryId: string; stateId: string; districtId: string; cityId: string }) {
  const country = COUNTRIES.find((candidate) => candidate.id === ids.countryId);
  const found = stateOf(ids.stateId);
  return {
    country: country?.name ?? '—',
    state: found?.name ?? '—',
    district: nameOf(found?.districts ?? [], ids.districtId),
    city: nameOf(found?.cities ?? [], ids.cityId),
  };
}
