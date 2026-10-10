import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { AccessDenied } from '@/components/feedback/access-denied';
import { NavIcon } from '@/components/layout/nav-icon';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getModule, isModuleId, PERMISSION_ACTIONS, type ModuleId } from '@/config/modules';
import { hasGrant } from '@/lib/access/grants';
import { checkModuleAccess } from '@/server/auth/guards';

/** Modules with dedicated routes; everything else in the catalogue renders this outline until its phase lands. */
const DEDICATED: readonly ModuleId[] = ['dashboard', 'users', 'institution'];

function resolve(slug: string): ModuleId {
  if (!isModuleId(slug) || DEDICATED.includes(slug)) notFound();
  return slug;
}

export async function generateMetadata({ params }: PageProps<'/[module]'>): Promise<Metadata> {
  const { module } = await params;
  return { title: isModuleId(module) ? getModule(module).label : 'Not found' };
}

export default async function ModulePage({ params }: PageProps<'/[module]'>) {
  const id = resolve((await params).module);
  const access = await checkModuleAccess(id);
  const definition = getModule(id);
  if (!access.allowed) {
    return (
      <>
        <PageHeader title={definition.label} />
        <AccessDenied module={id} roleName={access.session.principal.roleName} />
      </>
    );
  }
  const grants = access.session.principal.grants;
  const allowedActions = PERMISSION_ACTIONS.filter((action) => hasGrant(grants, id, action));

  return (
    <>
      <PageHeader
        title={definition.label}
        description={definition.description}
        actions={
          definition.concept ? <Badge variant="info">Concept</Badge> : <Badge variant="neutral">In progress</Badge>
        }
      />
      <Card>
        <CardHeader className="flex-row items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary" aria-hidden>
            <NavIcon icon={definition.icon} className="size-5" />
          </span>
          <div className="space-y-1">
            <CardTitle>{definition.concept ? 'Future concept' : 'Screens for this module are not built yet'}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {definition.concept
                ? 'This is a concept only. No AI model or data pipeline is connected, and nothing on this page is generated.'
                : `Planned for phase ${definition.phase} of the ERP web build. The capabilities below are the planned scope; none of them work yet.`}
            </p>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <section aria-labelledby="capabilities-heading" className="space-y-2">
            <h2 id="capabilities-heading" className="text-sm font-semibold">
              Planned capabilities
            </h2>
            <ul className="space-y-1.5 text-sm">
              {definition.capabilities.map((capability) => (
                <li key={capability} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                  {capability}
                </li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="permissions-heading" className="space-y-2">
            <h2 id="permissions-heading" className="text-sm font-semibold">
              Your permissions here
            </h2>
            <p className="text-sm text-muted-foreground">
              As {access.session.principal.roleName} you can:{' '}
              {allowedActions.length > 0 ? allowedActions.join(', ') : 'nothing'}.
            </p>
          </section>
        </CardContent>
      </Card>
    </>
  );
}
