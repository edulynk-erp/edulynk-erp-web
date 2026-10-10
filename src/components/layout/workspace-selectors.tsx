'use client';

import { Building2, CalendarRange } from 'lucide-react';
import { SelectMenu } from '@/components/ui/select-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useWorkspace } from '@/services/provider';

/** Campus and academic-year selectors. Screens read the selection through `useWorkspace()`. */
export function WorkspaceSelectors() {
  const { workspace, campuses, allowAllCampuses, years, setWorkspace } = useWorkspace();
  if (!workspace) {
    return (
      <div className="hidden items-center gap-2 md:flex" aria-hidden>
        <Skeleton className="h-9 w-44" />
        <Skeleton className="h-9 w-48" />
      </div>
    );
  }

  return (
    <div className="hidden items-center gap-2 md:flex">
      {campuses.length === 1 && !allowAllCampuses ? (
        <p className="flex h-9 items-center gap-2 rounded-md border border-input bg-muted/50 px-2.5 text-sm">
          <Building2 className="size-4 text-muted-foreground" aria-hidden />
          <span className="sr-only">Campus: </span>
          {campuses[0]!.name}
        </p>
      ) : (
        <SelectMenu
          aria-label="Campus"
          icon={Building2}
          className="h-9 w-44"
          value={workspace.campusId}
          onValueChange={(campusId) => setWorkspace({ ...workspace, campusId })}
          options={[
            ...(allowAllCampuses ? [{ value: 'all', label: 'All campuses' }] : []),
            ...campuses.map((campus) => ({ value: campus.id, label: campus.name })),
          ]}
        />
      )}
      <SelectMenu
        aria-label="Academic year"
        icon={CalendarRange}
        className="h-9 w-48"
        value={workspace.academicYearId}
        onValueChange={(academicYearId) => setWorkspace({ ...workspace, academicYearId })}
        options={years.map((year) => ({
          value: year.id,
          label: `${year.label}${year.status === 'current' ? ' (current)' : ''}`,
        }))}
      />
    </div>
  );
}
