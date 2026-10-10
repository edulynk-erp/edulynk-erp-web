import Link from 'next/link';
import { ForbiddenState } from '@/components/feedback/states';
import { Button } from '@/components/ui/button';
import { getModule, type ModuleId, type PermissionAction } from '@/config/modules';

/** Rendered by the server when the signed-in role lacks the grant for a screen reached directly by URL. */
export function AccessDenied({
  module,
  action = 'view',
  roleName,
}: {
  module: ModuleId;
  action?: PermissionAction;
  roleName: string;
}) {
  const { label } = getModule(module);
  return (
    <ForbiddenState
      title="You don't have access to this page"
      description={
        <>
          Your role ({roleName}) does not include the <span className="font-medium">{action}</span> permission for{' '}
          <span className="font-medium">{label}</span>. Ask an institution administrator if you need access.
        </>
      }
      action={
        <Button asChild variant="outline">
          <Link href="/dashboard" prefetch={false}>
            Go to dashboard
          </Link>
        </Button>
      }
    />
  );
}
