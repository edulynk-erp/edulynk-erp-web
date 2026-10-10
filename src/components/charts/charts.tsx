'use client';

import { useSyncExternalStore, type ReactNode } from 'react';
import {
  Area,
  AreaChart as RechartsAreaChart,
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart as RechartsLineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils/cn';

export const CHART_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#0ea5e9'] as const;

export interface ChartSeries<K extends string> {
  key: K;
  label: string;
  color?: string;
}

type Datum = Record<string, string | number>;

const subscribe = () => () => {};

/** True only after hydration. Charts render nothing on the server: SVG `style` attributes would violate the CSP. */
function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

interface ChartFrameProps {
  /** Accessible summary; the chart itself is hidden from assistive technology. */
  summary: string;
  heightClass?: string;
  children: ReactNode;
}

function ChartFrame({ summary, heightClass = 'h-64', children }: ChartFrameProps) {
  const hydrated = useHydrated();
  return (
    <figure className={cn('relative w-full', heightClass)}>
      <figcaption className="sr-only">{summary}</figcaption>
      {hydrated ? (
        <div className="size-full" aria-hidden>
          <ResponsiveContainer width="100%" height="100%">
            {children as never}
          </ResponsiveContainer>
        </div>
      ) : (
        <Skeleton className="size-full" />
      )}
    </figure>
  );
}

const axisProps = { tickLine: false, axisLine: false, fontSize: 12, stroke: '#52606d' } as const;
const tooltipStyle = { borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 } as const;

interface CartesianProps<K extends string> {
  data: readonly Datum[];
  xKey: string;
  series: readonly ChartSeries<K>[];
  summary: string;
  heightClass?: string;
  formatValue?: (value: number) => string;
  stacked?: boolean;
}

export function BarChart<K extends string>({
  data,
  xKey,
  series,
  summary,
  heightClass,
  formatValue,
  stacked,
}: CartesianProps<K>) {
  return (
    <ChartFrame summary={summary} heightClass={heightClass}>
      <RechartsBarChart data={data as Datum[]} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey={xKey} {...axisProps} />
        <YAxis {...axisProps} width={56} tickFormatter={formatValue} />
        <Tooltip
          cursor={{ fill: '#eef2f6' }}
          contentStyle={tooltipStyle}
          formatter={formatValue ? (value) => formatValue(Number(value)) : undefined}
        />
        {series.length > 1 ? <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} /> : null}
        {series.map((item, index) => (
          <Bar
            key={item.key}
            dataKey={item.key}
            name={item.label}
            fill={item.color ?? CHART_COLORS[index % CHART_COLORS.length]}
            radius={stacked ? 0 : [4, 4, 0, 0]}
            maxBarSize={36}
            {...(stacked ? { stackId: 'stack' } : {})}
          />
        ))}
      </RechartsBarChart>
    </ChartFrame>
  );
}

export function LineChart<K extends string>({
  data,
  xKey,
  series,
  summary,
  heightClass,
  formatValue,
}: CartesianProps<K>) {
  return (
    <ChartFrame summary={summary} heightClass={heightClass}>
      <RechartsLineChart data={data as Datum[]} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey={xKey} {...axisProps} />
        <YAxis {...axisProps} width={56} tickFormatter={formatValue} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={formatValue ? (value) => formatValue(Number(value)) : undefined}
        />
        {series.length > 1 ? <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} /> : null}
        {series.map((item, index) => (
          <Line
            key={item.key}
            type="monotone"
            dataKey={item.key}
            name={item.label}
            stroke={item.color ?? CHART_COLORS[index % CHART_COLORS.length]}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </RechartsLineChart>
    </ChartFrame>
  );
}

export function AreaChart<K extends string>({
  data,
  xKey,
  series,
  summary,
  heightClass,
  formatValue,
}: CartesianProps<K>) {
  return (
    <ChartFrame summary={summary} heightClass={heightClass}>
      <RechartsAreaChart data={data as Datum[]} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey={xKey} {...axisProps} />
        <YAxis {...axisProps} width={56} tickFormatter={formatValue} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={formatValue ? (value) => formatValue(Number(value)) : undefined}
        />
        {series.map((item, index) => {
          const color = item.color ?? CHART_COLORS[index % CHART_COLORS.length];
          return (
            <Area
              key={item.key}
              type="monotone"
              dataKey={item.key}
              name={item.label}
              stroke={color}
              fill={color}
              fillOpacity={0.12}
              strokeWidth={2}
            />
          );
        })}
      </RechartsAreaChart>
    </ChartFrame>
  );
}

export interface DonutSlice {
  label: string;
  value: number;
  color?: string;
}

export function DonutChart({
  data,
  summary,
  centerLabel,
  centerValue,
  heightClass = 'h-56',
  widthClass = 'max-w-56',
  formatValue,
}: {
  data: readonly DonutSlice[];
  summary: string;
  centerLabel?: string;
  centerValue?: string;
  heightClass?: string;
  widthClass?: string;
  formatValue?: (value: number) => string;
}) {
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className={cn('relative w-full shrink-0', widthClass)}>
        <ChartFrame summary={summary} heightClass={heightClass}>
          <PieChart>
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={formatValue ? (value) => formatValue(Number(value)) : undefined}
            />
            <Pie
              data={data as DonutSlice[]}
              dataKey="value"
              nameKey="label"
              innerRadius="62%"
              outerRadius="92%"
              paddingAngle={2}
              stroke="none"
            >
              {data.map((slice, index) => (
                <Cell key={slice.label} fill={slice.color ?? CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ChartFrame>
        {centerValue ? (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center" aria-hidden>
            <span className="tabular text-xl font-semibold">{centerValue}</span>
            {centerLabel ? <span className="text-xs text-muted-foreground">{centerLabel}</span> : null}
          </div>
        ) : null}
      </div>
      <ul className="w-full space-y-2 text-sm">
        {data.map((slice, index) => (
          <li key={slice.label} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <ColorDot color={slice.color ?? CHART_COLORS[index % CHART_COLORS.length]!} />
              {slice.label}
            </span>
            <span className="tabular font-medium">{formatValue ? formatValue(slice.value) : slice.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Legend swatch drawn as SVG so no inline `style` attribute reaches server-rendered HTML. */
function ColorDot({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 10 10" className="size-2.5 shrink-0" aria-hidden>
      <circle cx="5" cy="5" r="5" fill={color} />
    </svg>
  );
}
