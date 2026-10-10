import { authorizeCampus, copy, type MockContext } from '@/demo/services/context';
import type { AcademicYear } from '@/domain/institution';
import type { IsoDate } from '@/domain/common';
import type { GrowthPoint, OwnerOverview, PipelineStage } from '@/domain/dashboard';
import { addDays, formatMonth, monthKey, todayIso } from '@/lib/format/date';
import type { DashboardService } from '@/services/dashboard';

const PIPELINE: readonly PipelineStage[] = ['enquiry', 'in-review', 'accepted', 'rejected'];
const RECENT_ACTIVITY_LIMIT = 4;

export function createDashboardService(context: MockContext): DashboardService {
  return {
    async ownerOverview(workspace) {
      authorizeCampus(context, workspace.campusId);
      const data = context.store.data;
      const today = todayIso(context.now());
      const from = `${monthKey(today)}-01`;
      const to = monthEnd(monthKey(today));
      const previousEnd = addDays(from, -1);
      const inCampus = ({ campusId }: { campusId: string }) =>
        workspace.campusId === 'all' || campusId === workspace.campusId;
      const inWorkspace = (record: { campusId: string; academicYearId: string }) =>
        inCampus(record) && record.academicYearId === workspace.academicYearId;

      const students = data.students.filter((student) => inWorkspace(student) && student.status === 'active');
      const staff = data.staff.filter((member) => inCampus(member) && member.status !== 'exited');
      const sections = data.sections.filter(inWorkspace).length;
      const payments = data.invoices.filter((invoice) => inWorkspace(invoice) && invoice.lastPaymentOn !== null);
      const collectedBy = (date: IsoDate) =>
        payments.filter((invoice) => invoice.lastPaymentOn! <= date).reduce((sum, invoice) => sum + invoice.paid, 0);

      const years = [...data.academicYears].sort((a, b) => a.startsOn.localeCompare(b.startsOn));
      const selected = years.find((year) => year.id === workspace.academicYearId) ?? years.at(-1)!;
      const previousYear = years.filter((year) => year.endsOn < selected.startsOn).at(-1);
      // Roster-based: earlier years are approximated from today's students and their admission dates.
      const roster = data.students.filter((student) => inCampus(student) && student.status === 'active');
      const strengthOn = (date: IsoDate) => roster.filter((student) => student.admittedOn <= date).length;
      const monthly = (year: AcademicYear | undefined): GrowthPoint[] =>
        year
          ? monthsOf(year, today).map((key) => ({ label: formatMonth(key), students: strengthOn(monthEnd(key)) }))
          : [];

      const admissions = data.admissions.filter(inWorkspace);
      const overview: OwnerOverview = {
        period: { from, to },
        students: {
          current: students.length,
          previous: students.filter((student) => student.admittedOn <= previousEnd).length,
        },
        staff: {
          current: staff.length,
          previous: staff.filter((member) => member.joinedOn <= previousEnd).length,
        },
        sections: { current: sections, previous: sections },
        feesCollected: { current: collectedBy(today), previous: collectedBy(previousEnd) },
        studentGrowth: {
          thisYear: monthly(selected),
          lastYear: monthly(previousYear),
          allYears: years
            .filter((year) => year.startsOn <= today)
            .map((year) => ({ label: year.label, students: strengthOn(year.endsOn < today ? year.endsOn : today) })),
        },
        admissions: PIPELINE.map((stage) => ({
          stage,
          count: admissions.filter((application) => application.stage === stage).length,
        })),
        recentActivity: [...data.audit].sort((a, b) => b.at.localeCompare(a.at)).slice(0, RECENT_ACTIVITY_LIMIT),
      };
      return copy(overview);
    },
  };
}

/** Month keys (`2026-04`) of an academic year, up to and including the current month. */
function monthsOf(year: AcademicYear, today: IsoDate): string[] {
  const last = monthKey(year.endsOn < today ? year.endsOn : today);
  const keys: string[] = [];
  for (let key = monthKey(year.startsOn); key <= last; key = monthKey(addDays(monthEnd(key), 1))) keys.push(key);
  return keys;
}

function monthEnd(key: string): IsoDate {
  const [year, month] = key.split('-').map(Number) as [number, number];
  const next = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`;
  return addDays(next, -1);
}
