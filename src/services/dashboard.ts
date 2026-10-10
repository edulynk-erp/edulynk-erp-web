import type { WorkspaceContext } from '@/domain/common';
import type { OwnerOverview } from '@/domain/dashboard';

export interface DashboardService {
  ownerOverview(context: WorkspaceContext): Promise<OwnerOverview>;
}
