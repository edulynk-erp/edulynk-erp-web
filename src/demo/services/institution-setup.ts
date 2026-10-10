import { DEMO_TENANT_ID } from '@/demo/access/accounts';
import {
  authorize,
  authorizeCampus,
  copy,
  randomId,
  recordAudit,
  simulateWrite,
  type MockContext,
} from '@/demo/services/context';
import { STRUCTURE_TEMPLATES } from '@/demo/seed/structure-templates';
import { classLevelName } from '@/config/institution';
import {
  INSTITUTION_TYPE_LABELS,
  LOCATION_KIND_LABELS,
  levelOf,
  profileOf,
  type UnitField,
} from '@/config/institution-types';
import type { CalendarEvent } from '@/domain/communication';
import type {
  AcademicTerm,
  AcademicUnit,
  AcademicUnitKind,
  AcademicYear,
  Campus,
  Department,
  GradingConfig,
  SchoolClass,
  Section,
  Subject,
} from '@/domain/institution';
import { addDays } from '@/lib/format/date';
import { hasGrant } from '@/lib/access/grants';
import {
  academicTermSchema,
  academicUnitSchemaFor,
  academicYearSchema,
  EMPTY_UNIT_INPUT,
  gradingConfigSchema,
  structureSettingsSchema,
  type AcademicUnitInput,
  calendarEventSchema,
  campusSchema,
  classSchema,
  departmentSchema,
  institutionSettingsSchema,
  sectionSchema,
  subjectSchema,
  toFieldErrors,
} from '@/lib/validation/institution';
import type { z } from '@/lib/validation/zod';
import { ServiceError } from '@/services/errors';
import type { InstitutionService } from '@/services/institution';

const tenantId = DEMO_TENANT_ID;

function parse<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new ServiceError('VALIDATION', 'Some details need attention.', toFieldErrors(result.error));
  }
  return result.data;
}

function find<T extends { readonly id: string }>(items: readonly T[], id: string, label: string): T {
  const item = items.find((candidate) => candidate.id === id);
  if (!item) throw new ServiceError('NOT_FOUND', `${label} not found. It may have been deleted.`);
  return item;
}

/** Throws a field-level VALIDATION error when another record already uses the value (case-insensitive). */
function requireUnique<T extends { readonly id: string }>(
  items: readonly T[],
  selfId: string | null,
  value: (item: T) => string,
  candidate: string,
  field: string,
  message: string,
): void {
  const normalised = candidate.trim().toLowerCase();
  if (items.some((item) => item.id !== selfId && value(item).trim().toLowerCase() === normalised)) {
    throw new ServiceError('VALIDATION', message, { [field]: message });
  }
}

function inUse(what: string, counts: Record<string, number>): void {
  const parts = Object.entries(counts)
    .filter(([, count]) => count > 0)
    .map(([label, count]) => `${count} ${label}`);
  if (parts.length > 0) {
    throw new ServiceError('CONFLICT', `${what} is still used by ${parts.join(', ')}. Move or remove them first.`);
  }
}

function overlaps(a: { startsOn: string; endsOn: string }, b: { startsOn: string; endsOn: string }): boolean {
  return a.startsOn <= b.endsOn && b.startsOn <= a.endsOn;
}

/** Which unit attributes each structure field controls; attributes of fields a level does not use are cleared. */
const UNIT_FIELD_KEYS: Record<UnitField, readonly (keyof AcademicUnitInput)[]> = {
  code: ['code'],
  campus: ['campusId'],
  duration: ['durationValue', 'durationUnit'],
  periods: ['periods'],
  credits: ['credits'],
  courseType: ['courseType'],
  programmeLevel: ['programmeLevel'],
  degree: ['degree'],
  research: ['research'],
  practical: ['practical'],
  capacity: ['capacity'],
  dates: ['startsOn', 'endsOn'],
  schedule: ['schedule'],
  marks: ['maxMarks'],
  weightage: ['weightage'],
  members: ['memberIds'],
};

/** Keeps only the attributes the level uses, in record form. */
function unitAttributes(values: AcademicUnitInput, fields: readonly UnitField[]) {
  const used = new Set(fields.flatMap((field) => UNIT_FIELD_KEYS[field]));
  const pick = <K extends keyof AcademicUnitInput>(key: K): AcademicUnitInput[K] =>
    used.has(key) ? values[key] : EMPTY_UNIT_INPUT[key];
  return {
    code: pick('code').trim().toUpperCase(),
    campusId: pick('campusId') || null,
    durationValue: pick('durationValue'),
    durationUnit: pick('durationUnit'),
    periods: pick('periods'),
    credits: pick('credits'),
    courseType: pick('courseType'),
    programmeLevel: pick('programmeLevel'),
    degree: pick('degree').trim(),
    research: pick('research'),
    practical: pick('practical'),
    capacity: pick('capacity'),
    startsOn: pick('startsOn') || null,
    endsOn: pick('endsOn') || null,
    schedule: pick('schedule').trim(),
    maxMarks: pick('maxMarks'),
    weightage: pick('weightage'),
    memberIds: [...new Set(pick('memberIds'))],
  };
}

/** DEMO ONLY. Institution Setup over the in-browser store; the same records feed the header, users and dashboard. */
export function createInstitutionService(context: MockContext): InstitutionService {
  const data = () => context.store.data;
  const audit = (action: string, summary: string, subjectId: string | null) =>
    recordAudit(context, { module: 'institution', action, summary, subjectId });

  /** Institution-wide records need access to every campus; campus-scoped users manage only their own campuses. */
  const institutionWide = () => authorizeCampus(context, 'all');

  /** New locations must suit the institution type; existing ones keep their kind after a type change. */
  const requireLocationKind = (kind: Campus['kind'], currentKind: Campus['kind'] | null) => {
    const type = data().institution.type;
    if (kind !== currentKind && !profileOf(type).locationKinds.includes(kind)) {
      const message = `A ${INSTITUTION_TYPE_LABELS[type]} cannot add a ${LOCATION_KIND_LABELS[kind]}.`;
      throw new ServiceError('VALIDATION', message, { kind: message });
    }
  };

  const unitScope = (campusId: string | null) => (campusId ? authorizeCampus(context, campusId) : institutionWide());

  const requireCurrentType = (unit: AcademicUnit) => {
    const type = data().institution.type;
    if (unit.institutionType !== type) {
      throw new ServiceError(
        'CONFLICT',
        `This entry belongs to the ${INSTITUTION_TYPE_LABELS[unit.institutionType]} structure. It is kept, but can only be changed while the institution type is ${INSTITUTION_TYPE_LABELS[unit.institutionType]}.`,
      );
    }
  };

  /** Validates an entry against its level and the other entries, and returns the record fields to store. */
  const checkUnit = (input: AcademicUnitInput, selfId: string | null) => {
    const type = data().institution.type;
    const values = parse(academicUnitSchemaFor(type), input);
    const level = levelOf(type, values.kind)!;
    const attributes = unitAttributes(values, level.fields);
    const units = data().academicUnits.filter((unit) => unit.institutionType === type);
    let parentId: string | null = null;
    if (level.parents.length > 0 && values.parentId) {
      const parent = units.find((unit) => unit.id === values.parentId);
      if (!parent || parent.id === selfId || !level.parents.includes(parent.kind)) {
        throw new ServiceError('VALIDATION', 'Select where this belongs.', { parentId: 'Select where this belongs.' });
      }
      parentId = parent.id;
    }
    if (attributes.campusId) find(data().campuses, attributes.campusId, 'Campus');
    for (const memberId of attributes.memberIds) {
      if (!units.some((unit) => unit.id === memberId && unit.kind === 'subject')) {
        throw new ServiceError('VALIDATION', 'Choose subjects from the list.', {
          memberIds: 'Choose subjects from the list.',
        });
      }
    }
    const sameKind = units.filter((unit) => unit.kind === values.kind && unit.id !== selfId);
    if (attributes.code && sameKind.some((unit) => unit.code === attributes.code)) {
      const message = `Another ${level.singular.toLowerCase()} already uses this code.`;
      throw new ServiceError('VALIDATION', message, { code: message });
    }
    const name = values.name.trim();
    if (sameKind.some((unit) => unit.parentId === parentId && unit.name.toLowerCase() === name.toLowerCase())) {
      const message = parentId
        ? `This name is already used under the same ${levelOf(type, units.find((unit) => unit.id === parentId)!.kind)?.singular.toLowerCase() ?? 'parent'}.`
        : `Another ${level.singular.toLowerCase()} already has this name.`;
      throw new ServiceError('VALIDATION', message, { name: message });
    }
    return { type, level, record: { kind: values.kind, parentId, name, status: values.status, ...attributes } };
  };

  const checkTerm = (
    yearId: string,
    input: { name: string; startsOn: string; endsOn: string },
    selfId: string | null,
  ) => {
    const year = find(data().academicYears, yearId, 'Academic year');
    if (year.status === 'closed') throw new ServiceError('CONFLICT', `Academic year ${year.label} is closed.`);
    const values = parse(academicTermSchema, input);
    if (values.startsOn < year.startsOn || values.endsOn > year.endsOn) {
      const message = `Dates must fall within ${year.label} (${year.startsOn} to ${year.endsOn}).`;
      throw new ServiceError('VALIDATION', message, { startsOn: message });
    }
    const siblings = data().academicTerms.filter((term) => term.academicYearId === yearId && term.id !== selfId);
    const clash = siblings.find((term) => overlaps(term, values));
    if (clash) {
      const message = `These dates overlap ${clash.name}.`;
      throw new ServiceError('VALIDATION', message, { startsOn: message });
    }
    requireUnique(siblings, null, (term) => term.name, values.name, 'name', `${year.label} already has this name.`);
    return { year, values };
  };

  const classOrder = (classId: string) => data().classes.find((item) => item.id === classId)?.level ?? 99;

  const checkYearOverlap = (input: { startsOn: string; endsOn: string }, selfId: string | null) => {
    const clash = data().academicYears.find((year) => year.id !== selfId && overlaps(year, input));
    if (clash) {
      const message = `These dates overlap academic year ${clash.label}.`;
      throw new ServiceError('VALIDATION', message, { startsOn: message });
    }
  };

  return {
    async getInstitution() {
      return copy(data().institution);
    },

    async getOverview() {
      const { campuses, students, staff, academicYears, academicUnits, classes, institution } = data();
      const structure: Partial<Record<AcademicUnitKind, number>> = {};
      for (const unit of academicUnits) {
        if (unit.institutionType === institution.type && unit.status === 'active') {
          structure[unit.kind] = (structure[unit.kind] ?? 0) + 1;
        }
      }
      return {
        campuses: campuses.length,
        activeStudents: students.filter((student) => student.status === 'active').length,
        staff: staff.filter((member) => member.status !== 'exited').length,
        currentYearLabel: academicYears.find((year) => year.status === 'current')?.label ?? null,
        structure,
        classes: classes.length,
      };
    },

    async updateInstitution(input) {
      const actor = authorize(context, 'institution', 'edit');
      institutionWide();
      const values = parse(institutionSettingsSchema, input);
      const current = data().institution;
      const typeChanged = values.type !== current.type;
      if (typeChanged && !hasGrant(actor.grants, 'institution', 'approve')) {
        throw new ServiceError(
          'FORBIDDEN',
          'Changing the institution type needs the Approve permission. Ask the institution owner.',
        );
      }
      const brandingChanged = JSON.stringify(values.branding) !== JSON.stringify(current.branding);
      if (brandingChanged && !hasGrant(actor.grants, 'branding', 'edit')) {
        throw new ServiceError('FORBIDDEN', "You don't have permission to change the institution's branding.");
      }
      await simulateWrite(context);
      const next = {
        ...current,
        ...values,
        updatedAt: context.now().toISOString(),
        updatedBy: actor.name,
      };
      const changed = (Object.keys(values) as (keyof typeof values)[]).filter(
        (key) => JSON.stringify(values[key]) !== JSON.stringify(current[key]),
      );
      context.store.update('institution', () => next);
      if (typeChanged) {
        audit(
          'institution.type-changed',
          `Institution type changed from ${INSTITUTION_TYPE_LABELS[current.type]} to ${INSTITUTION_TYPE_LABELS[values.type]}; existing records kept`,
          current.id,
        );
      }
      audit(
        'institution.updated',
        changed.length > 0
          ? `Institution settings updated (${changed.length} ${changed.length === 1 ? 'field' : 'fields'})`
          : 'Institution settings saved without changes',
        current.id,
      );
      return copy(next);
    },

    // Campuses -----------------------------------------------------------------------------------------------------

    async listCampuses() {
      return copy(data().campuses);
    },

    async createCampus(input) {
      authorize(context, 'institution', 'create');
      institutionWide();
      const values = parse(campusSchema, input);
      requireLocationKind(values.kind, null);
      requireUnique(
        data().campuses,
        null,
        (c) => c.code,
        values.code,
        'code',
        'Another campus already uses this code.',
      );
      requireUnique(data().campuses, null, (c) => c.name, values.name, 'name', 'Another campus already has this name.');
      await simulateWrite(context);
      const campus: Campus = { tenantId, id: randomId('cmp'), ...values };
      context.store.update('campuses', (items) => [...items, campus]);
      audit('campus.created', `Campus ${campus.name} (${campus.code}) created`, campus.id);
      return copy(campus);
    },

    async updateCampus(id, input) {
      authorize(context, 'institution', 'edit');
      const current = find(data().campuses, id, 'Campus');
      authorizeCampus(context, id);
      const values = parse(campusSchema, input);
      requireLocationKind(values.kind, current.kind);
      requireUnique(data().campuses, id, (c) => c.code, values.code, 'code', 'Another campus already uses this code.');
      requireUnique(data().campuses, id, (c) => c.name, values.name, 'name', 'Another campus already has this name.');
      if (
        values.status === 'inactive' &&
        !data().campuses.some((campus) => campus.id !== id && campus.status === 'active')
      ) {
        throw new ServiceError('CONFLICT', 'At least one campus must stay active.');
      }
      await simulateWrite(context);
      const next: Campus = { ...current, ...values };
      context.store.update('campuses', (items) => items.map((item) => (item.id === id ? next : item)));
      audit('campus.updated', `Campus ${next.name} updated`, id);
      return copy(next);
    },

    async deleteCampus(id) {
      authorize(context, 'institution', 'delete');
      const campus = find(data().campuses, id, 'Campus');
      authorizeCampus(context, id);
      if (data().campuses.length === 1) throw new ServiceError('CONFLICT', 'The only campus cannot be deleted.');
      const { classes, users, staff, students } = data();
      inUse(campus.name, {
        classes: classes.filter((item) => item.campusId === id).length,
        users: users.filter((item) => item.campusId === id).length,
        'staff members': staff.filter((item) => item.campusId === id).length,
        students: students.filter((item) => item.campusId === id).length,
        'academic structure entries': data().academicUnits.filter((item) => item.campusId === id).length,
      });
      await simulateWrite(context);
      context.store.update('campuses', (items) => items.filter((item) => item.id !== id));
      audit('campus.deleted', `Campus ${campus.name} deleted`, id);
    },

    // Academic years -----------------------------------------------------------------------------------------------

    async listAcademicYears() {
      return copy([...data().academicYears].sort((a, b) => b.startsOn.localeCompare(a.startsOn)));
    },

    async createAcademicYear(input) {
      authorize(context, 'institution', 'create');
      institutionWide();
      const values = parse(academicYearSchema, input);
      requireUnique(data().academicYears, null, (y) => y.label, values.label, 'label', 'This label is already used.');
      checkYearOverlap(values, null);
      await simulateWrite(context);
      const year: AcademicYear = { tenantId, id: randomId('ay'), ...values, status: 'planned' };
      context.store.update('academicYears', (items) => [...items, year]);
      audit('academic-year.created', `Academic year ${year.label} planned`, year.id);
      return copy(year);
    },

    async updateAcademicYear(id, input) {
      authorize(context, 'institution', 'edit');
      institutionWide();
      const current = find(data().academicYears, id, 'Academic year');
      if (current.status === 'closed') throw new ServiceError('CONFLICT', 'Closed academic years cannot be changed.');
      const values = parse(academicYearSchema, input);
      requireUnique(data().academicYears, id, (y) => y.label, values.label, 'label', 'This label is already used.');
      checkYearOverlap(values, id);
      await simulateWrite(context);
      const next: AcademicYear = { ...current, ...values };
      context.store.update('academicYears', (items) => items.map((item) => (item.id === id ? next : item)));
      audit('academic-year.updated', `Academic year ${next.label} updated`, id);
      return copy(next);
    },

    async setCurrentAcademicYear(id) {
      authorize(context, 'institution', 'approve');
      institutionWide();
      const target = find(data().academicYears, id, 'Academic year');
      if (target.status !== 'planned') {
        throw new ServiceError(
          'CONFLICT',
          `Only a planned year can be made current; ${target.label} is ${target.status}.`,
        );
      }
      await simulateWrite(context);
      const previous = data().academicYears.find((year) => year.status === 'current');
      context.store.update('academicYears', (items) =>
        items.map((item) =>
          item.id === id
            ? { ...item, status: 'current' }
            : item.status === 'current'
              ? { ...item, status: 'closed' }
              : item,
        ),
      );
      audit(
        'academic-year.activated',
        `Academic year ${target.label} made current${previous ? `; ${previous.label} closed` : ''}`,
        id,
      );
      return copy({ ...target, status: 'current' as const });
    },

    async deleteAcademicYear(id) {
      authorize(context, 'institution', 'delete');
      institutionWide();
      const year = find(data().academicYears, id, 'Academic year');
      if (year.status !== 'planned') {
        throw new ServiceError('CONFLICT', `Only planned years can be deleted; ${year.label} is ${year.status}.`);
      }
      inUse(`Academic year ${year.label}`, {
        'terms or semesters': data().academicTerms.filter((item) => item.academicYearId === id).length,
        sections: data().sections.filter((item) => item.academicYearId === id).length,
        students: data().students.filter((item) => item.academicYearId === id).length,
      });
      await simulateWrite(context);
      context.store.update('academicYears', (items) => items.filter((item) => item.id !== id));
      audit('academic-year.deleted', `Academic year ${year.label} deleted`, id);
    },

    // Classes and sections -----------------------------------------------------------------------------------------

    async listClasses() {
      const campusOrder = new Map(data().campuses.map((campus, index) => [campus.id, index]));
      return copy(
        [...data().classes].sort(
          (a, b) => (campusOrder.get(a.campusId) ?? 99) - (campusOrder.get(b.campusId) ?? 99) || a.level - b.level,
        ),
      );
    },

    async createClass(input) {
      authorize(context, 'institution', 'create');
      const values = parse(classSchema, input);
      authorizeCampus(context, values.campusId);
      const campus = find(data().campuses, values.campusId, 'Campus');
      const siblings = data().classes.filter((item) => item.campusId === values.campusId);
      if (siblings.some((item) => item.level === values.level)) {
        const message = `${campus.name} already has ${classLevelName(values.level)}.`;
        throw new ServiceError('VALIDATION', message, { level: message });
      }
      requireUnique(
        siblings,
        null,
        (c) => c.name,
        values.name,
        'name',
        'This campus already has a class with this name.',
      );
      await simulateWrite(context);
      const schoolClass: SchoolClass = { tenantId, id: randomId('cls'), ...values };
      context.store.update('classes', (items) => [...items, schoolClass]);
      audit('class.created', `${schoolClass.name} added to ${campus.name}`, schoolClass.id);
      return copy(schoolClass);
    },

    async updateClass(id, input) {
      authorize(context, 'institution', 'edit');
      const current = find(data().classes, id, 'Class');
      authorizeCampus(context, current.campusId);
      const values = parse(classSchema, input);
      authorizeCampus(context, values.campusId);
      const campus = find(data().campuses, values.campusId, 'Campus');
      if (values.campusId !== current.campusId) {
        inUse(current.name, {
          sections: data().sections.filter((item) => item.classId === id).length,
          students: data().students.filter((item) => item.classId === id).length,
        });
      }
      const siblings = data().classes.filter((item) => item.campusId === values.campusId && item.id !== id);
      if (siblings.some((item) => item.level === values.level)) {
        const message = `${campus.name} already has ${classLevelName(values.level)}.`;
        throw new ServiceError('VALIDATION', message, { level: message });
      }
      requireUnique(
        siblings,
        id,
        (c) => c.name,
        values.name,
        'name',
        'This campus already has a class with this name.',
      );
      await simulateWrite(context);
      const next: SchoolClass = { ...current, ...values };
      context.store.update('classes', (items) => items.map((item) => (item.id === id ? next : item)));
      audit('class.updated', `${next.name} (${campus.name}) updated`, id);
      return copy(next);
    },

    async deleteClass(id) {
      authorize(context, 'institution', 'delete');
      const schoolClass = find(data().classes, id, 'Class');
      authorizeCampus(context, schoolClass.campusId);
      inUse(schoolClass.name, {
        sections: data().sections.filter((item) => item.classId === id).length,
        students: data().students.filter((item) => item.classId === id).length,
      });
      await simulateWrite(context);
      context.store.update('classes', (items) => items.filter((item) => item.id !== id));
      audit('class.deleted', `${schoolClass.name} deleted`, id);
    },

    async listSections(academicYearId) {
      const enrolled = new Map<string, number>();
      for (const student of data().students) {
        if (student.status === 'active') enrolled.set(student.sectionId, (enrolled.get(student.sectionId) ?? 0) + 1);
      }
      return copy(
        data()
          .sections.filter((section) => section.academicYearId === academicYearId)
          .sort((a, b) => classOrder(a.classId) - classOrder(b.classId) || a.name.localeCompare(b.name))
          .map((section) => ({ ...section, enrolled: enrolled.get(section.id) ?? 0 })),
      );
    },

    async createSection(academicYearId, input) {
      authorize(context, 'institution', 'create');
      const year = find(data().academicYears, academicYearId, 'Academic year');
      if (year.status === 'closed') throw new ServiceError('CONFLICT', `Academic year ${year.label} is closed.`);
      const values = parse(sectionSchema, input);
      const schoolClass = find(data().classes, values.classId, 'Class');
      authorizeCampus(context, schoolClass.campusId);
      const siblings = data().sections.filter(
        (item) => item.academicYearId === academicYearId && item.classId === values.classId,
      );
      requireUnique(
        siblings,
        null,
        (s) => s.name,
        values.name,
        'name',
        `${schoolClass.name} already has this section.`,
      );
      await simulateWrite(context);
      const section: Section = {
        tenantId,
        id: randomId('sec'),
        campusId: schoolClass.campusId,
        academicYearId,
        classId: values.classId,
        name: values.name.toUpperCase(),
        capacity: values.capacity,
        classTeacherId: null,
      };
      context.store.update('sections', (items) => [...items, section]);
      audit('section.created', `Section ${schoolClass.name} ${section.name} created for ${year.label}`, section.id);
      return copy(section);
    },

    async updateSection(id, input) {
      authorize(context, 'institution', 'edit');
      const current = find(data().sections, id, 'Section');
      authorizeCampus(context, current.campusId);
      const values = parse(sectionSchema, input);
      const schoolClass = find(data().classes, values.classId, 'Class');
      authorizeCampus(context, schoolClass.campusId);
      const enrolled = data().students.filter((item) => item.sectionId === id && item.status === 'active').length;
      if (values.classId !== current.classId && enrolled > 0) {
        throw new ServiceError(
          'CONFLICT',
          `${enrolled} students are enrolled in this section; it cannot change class.`,
        );
      }
      if (values.capacity < enrolled) {
        const message = `${enrolled} students are enrolled; capacity cannot be lower.`;
        throw new ServiceError('VALIDATION', message, { capacity: message });
      }
      const siblings = data().sections.filter(
        (item) => item.academicYearId === current.academicYearId && item.classId === values.classId,
      );
      requireUnique(siblings, id, (s) => s.name, values.name, 'name', `${schoolClass.name} already has this section.`);
      await simulateWrite(context);
      const next: Section = {
        ...current,
        classId: values.classId,
        campusId: schoolClass.campusId,
        name: values.name.toUpperCase(),
        capacity: values.capacity,
      };
      context.store.update('sections', (items) => items.map((item) => (item.id === id ? next : item)));
      audit('section.updated', `Section ${schoolClass.name} ${next.name} updated`, id);
      return copy(next);
    },

    async deleteSection(id) {
      authorize(context, 'institution', 'delete');
      const section = find(data().sections, id, 'Section');
      authorizeCampus(context, section.campusId);
      const className = data().classes.find((item) => item.id === section.classId)?.name ?? 'Class';
      inUse(`Section ${className} ${section.name}`, {
        students: data().students.filter((item) => item.sectionId === id).length,
      });
      await simulateWrite(context);
      context.store.update('sections', (items) => items.filter((item) => item.id !== id));
      audit('section.deleted', `Section ${className} ${section.name} deleted`, id);
    },

    // Departments and subjects -------------------------------------------------------------------------------------

    async listDepartments() {
      return copy(data().departments);
    },

    async createDepartment(input) {
      authorize(context, 'institution', 'create');
      institutionWide();
      const values = parse(departmentSchema, input);
      requireUnique(data().departments, null, (d) => d.name, values.name, 'name', 'This department already exists.');
      requireUnique(data().departments, null, (d) => d.code, values.code, 'code', 'Another department uses this code.');
      await simulateWrite(context);
      const department: Department = { tenantId, id: randomId('dep'), ...values };
      context.store.update('departments', (items) => [...items, department]);
      audit('department.created', `Department ${department.name} created`, department.id);
      return copy(department);
    },

    async updateDepartment(id, input) {
      authorize(context, 'institution', 'edit');
      institutionWide();
      const current = find(data().departments, id, 'Department');
      const values = parse(departmentSchema, input);
      requireUnique(data().departments, id, (d) => d.name, values.name, 'name', 'This department already exists.');
      requireUnique(data().departments, id, (d) => d.code, values.code, 'code', 'Another department uses this code.');
      await simulateWrite(context);
      const next: Department = { ...current, ...values };
      context.store.update('departments', (items) => items.map((item) => (item.id === id ? next : item)));
      audit('department.updated', `Department ${next.name} updated`, id);
      return copy(next);
    },

    async deleteDepartment(id) {
      authorize(context, 'institution', 'delete');
      institutionWide();
      const department = find(data().departments, id, 'Department');
      inUse(department.name, {
        users: data().users.filter((item) => item.departmentId === id).length,
        'staff members': data().staff.filter((item) => item.departmentId === id).length,
        subjects: data().subjects.filter((item) => item.departmentId === id).length,
      });
      await simulateWrite(context);
      context.store.update('departments', (items) => items.filter((item) => item.id !== id));
      audit('department.deleted', `Department ${department.name} deleted`, id);
    },

    async listSubjects() {
      return copy([...data().subjects].sort((a, b) => a.levelFrom - b.levelFrom || a.name.localeCompare(b.name)));
    },

    async createSubject(input) {
      authorize(context, 'institution', 'create');
      institutionWide();
      const values = parse(subjectSchema, input);
      requireUnique(data().subjects, null, (s) => s.code, values.code, 'code', 'Another subject uses this code.');
      requireUnique(data().subjects, null, (s) => s.name, values.name, 'name', 'This subject already exists.');
      if (values.departmentId) find(data().departments, values.departmentId, 'Department');
      await simulateWrite(context);
      const subject: Subject = { tenantId, id: randomId('sub'), ...values, departmentId: values.departmentId || null };
      context.store.update('subjects', (items) => [...items, subject]);
      audit('subject.created', `Subject ${subject.name} (${subject.code}) created`, subject.id);
      return copy(subject);
    },

    async updateSubject(id, input) {
      authorize(context, 'institution', 'edit');
      institutionWide();
      const current = find(data().subjects, id, 'Subject');
      const values = parse(subjectSchema, input);
      requireUnique(data().subjects, id, (s) => s.code, values.code, 'code', 'Another subject uses this code.');
      requireUnique(data().subjects, id, (s) => s.name, values.name, 'name', 'This subject already exists.');
      if (values.departmentId) find(data().departments, values.departmentId, 'Department');
      await simulateWrite(context);
      const next: Subject = { ...current, ...values, departmentId: values.departmentId || null };
      context.store.update('subjects', (items) => items.map((item) => (item.id === id ? next : item)));
      audit('subject.updated', `Subject ${next.name} updated`, id);
      return copy(next);
    },

    async deleteSubject(id) {
      authorize(context, 'institution', 'delete');
      institutionWide();
      const subject = find(data().subjects, id, 'Subject');
      await simulateWrite(context);
      context.store.update('subjects', (items) => items.filter((item) => item.id !== id));
      audit('subject.deleted', `Subject ${subject.name} deleted`, id);
    },

    // Academic calendar --------------------------------------------------------------------------------------------

    async listCalendarEvents(academicYearId) {
      const year = find(data().academicYears, academicYearId, 'Academic year');
      return copy(
        data()
          .events.filter((event) => overlaps(event, year))
          .sort((a, b) => a.startsOn.localeCompare(b.startsOn) || a.title.localeCompare(b.title)),
      );
    },

    async createCalendarEvent(input) {
      authorize(context, 'institution', 'create');
      const values = parse(calendarEventSchema, input);
      authorizeCampus(context, values.campusId);
      if (values.campusId !== 'all') find(data().campuses, values.campusId, 'Campus');
      await simulateWrite(context);
      const event: CalendarEvent = { tenantId, id: randomId('evt'), ...values };
      context.store.update('events', (items) => [...items, event]);
      audit('calendar.event-created', `Calendar entry "${event.title}" added`, event.id);
      return copy(event);
    },

    async updateCalendarEvent(id, input) {
      authorize(context, 'institution', 'edit');
      const current = find(data().events, id, 'Calendar entry');
      authorizeCampus(context, current.campusId);
      const values = parse(calendarEventSchema, input);
      authorizeCampus(context, values.campusId);
      if (values.campusId !== 'all') find(data().campuses, values.campusId, 'Campus');
      await simulateWrite(context);
      const next: CalendarEvent = { ...current, ...values };
      context.store.update('events', (items) => items.map((item) => (item.id === id ? next : item)));
      audit('calendar.event-updated', `Calendar entry "${next.title}" updated`, id);
      return copy(next);
    },

    async deleteCalendarEvent(id) {
      authorize(context, 'institution', 'delete');
      const event = find(data().events, id, 'Calendar entry');
      authorizeCampus(context, event.campusId);
      await simulateWrite(context);
      context.store.update('events', (items) => items.filter((item) => item.id !== id));
      audit('calendar.event-deleted', `Calendar entry "${event.title}" deleted`, id);
    },
    // Structure settings and academic structure ---------------------------------------------------------------------

    async updateStructureSettings(type, input) {
      const actor = authorize(context, 'institution', 'edit');
      institutionWide();
      const values = parse(structureSettingsSchema, input);
      const kinds = new Set(profileOf(type).levels.map((level) => level.kind));
      const labels = Object.fromEntries(
        Object.entries(values.labels).filter(([kind, label]) => kinds.has(kind as AcademicUnitKind) && label?.trim()),
      );
      await simulateWrite(context);
      const current = data().institution;
      const next = {
        ...current,
        structure: { ...current.structure, [type]: { ...values, labels } },
        updatedAt: context.now().toISOString(),
        updatedBy: actor.name,
      };
      context.store.update('institution', () => next);
      audit('structure.settings-updated', `${INSTITUTION_TYPE_LABELS[type]} structure naming updated`, current.id);
      return copy(next);
    },

    async listAcademicUnits() {
      return copy(data().academicUnits);
    },

    async createAcademicUnit(input) {
      authorize(context, 'institution', 'create');
      const { type, level, record } = checkUnit(input, null);
      unitScope(record.campusId);
      await simulateWrite(context);
      const unit: AcademicUnit = { tenantId, id: randomId('unt'), institutionType: type, ...record };
      context.store.update('academicUnits', (items) => [...items, unit]);
      audit('structure.created', `${level.singular} ${unit.name} added`, unit.id);
      return copy(unit);
    },

    async updateAcademicUnit(id, input) {
      authorize(context, 'institution', 'edit');
      const current = find(data().academicUnits, id, 'Structure entry');
      requireCurrentType(current);
      unitScope(current.campusId);
      if (input.kind !== current.kind) throw new ServiceError('CONFLICT', 'An entry cannot change its level.');
      const { level, record } = checkUnit(input, id);
      unitScope(record.campusId);
      await simulateWrite(context);
      const next: AcademicUnit = { ...current, ...record };
      context.store.update('academicUnits', (items) => items.map((item) => (item.id === id ? next : item)));
      audit('structure.updated', `${level.singular} ${next.name} updated`, id);
      return copy(next);
    },

    async deleteAcademicUnit(id) {
      authorize(context, 'institution', 'delete');
      const unit = find(data().academicUnits, id, 'Structure entry');
      requireCurrentType(unit);
      unitScope(unit.campusId);
      const units = data().academicUnits;
      inUse(unit.name, {
        'entries under it': units.filter((item) => item.parentId === id).length,
        'subject combinations': units.filter((item) => item.memberIds.includes(id)).length,
      });
      await simulateWrite(context);
      context.store.update('academicUnits', (items) => items.filter((item) => item.id !== id));
      audit(
        'structure.deleted',
        `${levelOf(unit.institutionType, unit.kind)?.singular ?? 'Entry'} ${unit.name} deleted`,
        id,
      );
    },

    async applyStructureTemplate() {
      authorize(context, 'institution', 'create');
      institutionWide();
      const type = data().institution.type;
      const template = STRUCTURE_TEMPLATES[type];
      if (!template) {
        throw new ServiceError('CONFLICT', 'Schools set up classes, sections and subjects on their own screens.');
      }
      if (data().academicUnits.some((unit) => unit.institutionType === type)) {
        throw new ServiceError('CONFLICT', 'A starter structure can only be loaded while the structure is empty.');
      }
      const today = context.now().toISOString().slice(0, 10);
      const ids = new Map(template.map((entry) => [entry.ref, randomId('unt')]));
      const schema = academicUnitSchemaFor(type);
      const units = template.map((entry): AcademicUnit => {
        const level = levelOf(type, entry.values.kind)!;
        const usesDates = level.fields.includes('dates');
        const values = parse(schema, {
          ...EMPTY_UNIT_INPUT,
          ...entry.values,
          parentId: entry.parent ? ids.get(entry.parent)! : '',
          memberIds: (entry.members ?? []).map((ref) => ids.get(ref)!),
          startsOn: entry.values.startsOn ?? (usesDates ? today : ''),
          endsOn: entry.values.endsOn ?? (usesDates ? addDays(today, 180) : ''),
        });
        return {
          tenantId,
          id: ids.get(entry.ref)!,
          institutionType: type,
          kind: values.kind,
          parentId: values.parentId || null,
          name: values.name,
          status: 'active',
          ...unitAttributes(values, level.fields),
        };
      });
      await simulateWrite(context);
      context.store.update('academicUnits', (items) => [...items, ...units]);
      audit(
        'structure.template-loaded',
        `Starter ${INSTITUTION_TYPE_LABELS[type]} structure loaded (${units.length} entries)`,
        null,
      );
      return units.length;
    },

    // Terms and semesters --------------------------------------------------------------------------------------------

    async listAcademicTerms(academicYearId) {
      return copy(
        data()
          .academicTerms.filter((term) => term.academicYearId === academicYearId)
          .sort((a, b) => a.startsOn.localeCompare(b.startsOn)),
      );
    },

    async createAcademicTerm(academicYearId, input) {
      authorize(context, 'institution', 'create');
      institutionWide();
      const { year, values } = checkTerm(academicYearId, input, null);
      await simulateWrite(context);
      const term: AcademicTerm = { tenantId, id: randomId('trm'), academicYearId, ...values };
      context.store.update('academicTerms', (items) => [...items, term]);
      audit('term.created', `${term.name} added to ${year.label}`, term.id);
      return copy(term);
    },

    async updateAcademicTerm(id, input) {
      authorize(context, 'institution', 'edit');
      institutionWide();
      const current = find(data().academicTerms, id, 'Term');
      const { year, values } = checkTerm(current.academicYearId, input, id);
      await simulateWrite(context);
      const next: AcademicTerm = { ...current, ...values };
      context.store.update('academicTerms', (items) => items.map((item) => (item.id === id ? next : item)));
      audit('term.updated', `${next.name} (${year.label}) updated`, id);
      return copy(next);
    },

    async deleteAcademicTerm(id) {
      authorize(context, 'institution', 'delete');
      institutionWide();
      const term = find(data().academicTerms, id, 'Term');
      const year = find(data().academicYears, term.academicYearId, 'Academic year');
      if (year.status === 'closed') throw new ServiceError('CONFLICT', `Academic year ${year.label} is closed.`);
      await simulateWrite(context);
      context.store.update('academicTerms', (items) => items.filter((item) => item.id !== id));
      audit('term.deleted', `${term.name} removed from ${year.label}`, id);
    },

    // Grading ---------------------------------------------------------------------------------------------------------

    async getGradingConfig() {
      return copy(data().grading);
    },

    async updateGradingConfig(input) {
      const actor = authorize(context, 'institution', 'edit');
      institutionWide();
      const values = parse(gradingConfigSchema, input);
      await simulateWrite(context);
      const next: GradingConfig = {
        ...data().grading,
        ...values,
        updatedAt: context.now().toISOString(),
        updatedBy: actor.name,
      };
      context.store.update('grading', () => next);
      audit('grading.updated', `Grading & assessment rules updated (${values.bands.length} grade bands)`, null);
      return copy(next);
    },

    // Entitlements ----------------------------------------------------------------------------------------------------

    async listEntitlements() {
      return copy(data().entitlements);
    },
  };
}
