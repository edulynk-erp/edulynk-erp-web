/** ISO-8601 date (`2026-10-09`). */
export type IsoDate = string;
/** ISO-8601 timestamp with offset (`2026-10-09T09:30:00.000Z`). */
export type IsoDateTime = string;
/** Whole rupees. Paise are not modelled yet. */
export type Rupees = number;

/**
 * Every tenant-owned record carries its tenant. In the real system the tenant is derived by the institution API from
 * the verified identity; a tenant ID supplied by the browser is never proof of authorization.
 */
export interface TenantScoped {
  readonly tenantId: string;
}

export interface CampusScoped extends TenantScoped {
  readonly campusId: string;
}

export interface YearScoped extends CampusScoped {
  readonly academicYearId: string;
}

/** The campus and academic year selected in the header. `campusId: 'all'` spans every campus. */
export interface WorkspaceContext {
  readonly campusId: string | 'all';
  readonly academicYearId: string;
}

/** Campuses a signed-in user may work in: every campus (institution-wide roles) or an explicit list. */
export type CampusScope = 'all' | readonly string[];

export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary';
