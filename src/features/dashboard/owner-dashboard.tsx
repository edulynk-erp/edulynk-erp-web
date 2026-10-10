'use client';

import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarClock,
  CalendarDays,
  ClipboardList,
  FilePlus2,
  GraduationCap,
  IndianRupee,
  School,
  UserPlus,
  Users,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { BarChart, DonutChart } from '@/components/charts/charts';
import { ErrorState } from '@/components/feedback/states';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard, StatCardSkeleton } from '@/components/ui/stat-card';
import { profileOf } from '@/config/institution-types';
import type { AuditEvent } from '@/domain/audit';
import type { OwnerOverview, PeriodMetric, PipelineStage } from '@/domain/dashboard';
import { formatDate, formatDateTime } from '@/lib/format/date';
import { formatCount, formatInr, formatPercent, percent } from '@/lib/format/number';
import { cn } from '@/lib/utils/cn';
import { useCan, usePrincipal, useServiceQuery, useWorkspace } from '@/services/provider';

type GrowthRange = 'thisYear' | 'lastYear' | 'allYears';

const GROWTH_RANGES: readonly { value: GrowthRange; label: string }[] = [
  { value: 'thisYear', label: 'This Year' },
  { value: 'lastYear', label: 'Last Year' },
  { value: 'allYears', label: 'All Years' },
];

const STAGES: Record<PipelineStage, { label: string; color: string }> = {
  enquiry: { label: 'Enquiry', color: '#3b82f6' },
  'in-review': { label: 'In Review', color: '#8b5cf6' },
  accepted: { label: 'Accepted', color: '#10b981' },
  rejected: { label: 'Rejected', color: '#f59e0b' },
};

const ACTIVITY: Record<string, { title: string; icon: LucideIcon; tone: string }> = {
  admissions: { title: 'New admission application', icon: FilePlus2, tone: 'bg-primary/10 text-primary' },
  fees: { title: 'Payment received', icon: IndianRupee, tone: 'bg-success/15 text-success-foreground' },
  users: { title: 'New user added', icon: UserPlus, tone: 'bg-[#ede9fe] text-[#5b21b6]' },
  timetable: { title: 'Timetable updated', icon: CalendarClock, tone: 'bg-warning/15 text-warning-foreground' },
};
const FALLBACK_ACTIVITY = { title: null, icon: ClipboardList, tone: 'bg-muted text-muted-foreground' };

/** Institution-wide overview for the owner, following the selected campus and academic year. */
export function OwnerDashboard() {
  const principal = usePrincipal();
  const { workspace } = useWorkspace();
  const overview = useServiceQuery(async (s) => (workspace ? s.dashboard.ownerOverview(workspace) : null), [workspace]);
  const institution = useServiceQuery((s) => s.institution.getInstitution(), []);
  const terms = profileOf(institution.data?.type ?? 'school').terms;

  const data = overview.data ?? null;
  return (
    <div className="space-y-6">
      <Heading name={principal.displayName} period={data?.period} />
      {overview.error ? (
        <ErrorState title="The dashboard could not be loaded" description={overview.error} />
      ) : data ? (
        <>
          <Stats data={data} learners={terms.learners} />
          <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr_1fr]">
            <StudentGrowth data={data.studentGrowth} />
            <AdmissionOverview data={data.admissions} />
            <RecentActivity events={data.recentActivity} />
          </div>
        </>
      ) : (
        <LoadingState />
      )}
    </div>
  );
}

function Heading({ name, period }: { name: string; period?: OwnerOverview['period'] | undefined }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Welcome back, {name}!</p>
      </div>
      {period ? (
        <p className="inline-flex h-9 items-center gap-2 rounded-md border bg-card px-3 text-sm font-medium shadow-sm">
          <CalendarDays className="size-4 text-muted-foreground" aria-hidden />
          <span className="sr-only">Reporting period:</span>
          {formatDate(period.from)} - {formatDate(period.to)}
        </p>
      ) : null}
    </div>
  );
}

function Stats({ data, learners }: { data: OwnerOverview; learners: string }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label={`Total ${learners}`}
        value={formatCount(data.students.current)}
        icon={GraduationCap}
        tone="primary"
        detail={<Change metric={data.students} />}
      />
      <StatCard
        label="Total Staff"
        value={formatCount(data.staff.current)}
        icon={Users}
        tone="violet"
        detail={<Change metric={data.staff} />}
      />
      <StatCard
        label="Total Classes"
        value={formatCount(data.sections.current)}
        icon={School}
        tone="info"
        detail={<Change metric={data.sections} />}
      />
      <StatCard
        label="Fee Collection"
        value={formatInr(data.feesCollected.current)}
        icon={IndianRupee}
        tone="success"
        detail={<Change metric={data.feesCollected} />}
      />
    </div>
  );
}

function Change({ metric }: { metric: PeriodMetric }) {
  const raw = metric.previous === 0 ? 0 : percent(metric.current - metric.previous, metric.previous);
  const change = Math.round(raw * 10) / 10;
  const down = change < 0;
  const Icon = down ? ArrowDownRight : ArrowUpRight;
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className={cn(
          'inline-flex items-center gap-0.5 font-medium',
          down ? 'text-destructive' : change > 0 ? 'text-success-foreground' : 'text-muted-foreground',
        )}
      >
        <Icon className="size-3.5" aria-hidden />
        {formatPercent(Math.abs(change))}
      </span>
      {down ? 'lower than' : 'from'} last month
    </span>
  );
}

function StudentGrowth({ data }: { data: OwnerOverview['studentGrowth'] }) {
  const [range, setRange] = useState<GrowthRange>('thisYear');
  const points = data[range];
  const label = GROWTH_RANGES.find((option) => option.value === range)!.label;
  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
        <CardTitle className="text-base">Student Growth</CardTitle>
        <div role="group" aria-label="Student growth range" className="flex rounded-md bg-muted p-0.5 text-xs">
          {GROWTH_RANGES.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={range === option.value}
              onClick={() => setRange(option.value)}
              className={cn(
                'rounded px-2.5 py-1 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                range === option.value
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {points.length > 0 ? (
          <BarChart
            data={points.map(({ label: month, students }) => ({ month, students }))}
            xKey="month"
            series={[{ key: 'students', label: 'Students', color: '#3b82f6' }]}
            summary={`${label}: ${points.map((point) => `${point.label} ${formatCount(point.students)}`).join(', ')}.`}
            formatValue={formatCount}
          />
        ) : (
          <p className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            No earlier academic year to compare.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function AdmissionOverview({ data }: { data: OwnerOverview['admissions'] }) {
  const total = data.reduce((sum, item) => sum + item.count, 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Admission Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <DonutChart
          data={data.map((item) => ({
            label: STAGES[item.stage].label,
            value: item.count,
            color: STAGES[item.stage].color,
          }))}
          summary={`${formatCount(total)} applications: ${data
            .map((item) => `${formatCount(item.count)} ${STAGES[item.stage].label}`)
            .join(', ')}.`}
          centerValue={formatCount(total)}
          centerLabel="Applications"
          heightClass="h-40"
          widthClass="max-w-40"
          formatValue={formatCount}
        />
      </CardContent>
    </Card>
  );
}

function RecentActivity({ events }: { events: readonly AuditEvent[] }) {
  const can = useCan();
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base">Recent Activity</CardTitle>
        {can('audit') ? (
          <Link href="/audit" prefetch={false} className="text-sm font-medium text-primary hover:underline">
            View All
          </Link>
        ) : null}
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No activity yet.</p>
        ) : (
          <ul className="space-y-4">
            {events.map((event) => {
              const style = ACTIVITY[event.module] ?? FALLBACK_ACTIVITY;
              const Icon = style.icon;
              return (
                <li key={event.id} className="flex gap-3">
                  <span
                    className={cn('flex size-9 shrink-0 items-center justify-center rounded-full', style.tone)}
                    aria-hidden
                  >
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-sm font-semibold">{style.title ?? event.summary}</p>
                    {style.title ? <p className="truncate text-xs text-muted-foreground">{event.summary}</p> : null}
                    <p className="text-xs text-muted-foreground">
                      <time dateTime={event.at}>{formatDateTime(event.at)}</time>
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function LoadingState() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading dashboard">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <StatCardSkeleton key={index} />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr_1fr]">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-80 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
