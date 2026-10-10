import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PortalProviders } from '@/components/providers/portal-providers';
import { PERMISSION_ACTIONS, type Grant } from '@/config/modules';
import { InstitutionSetup } from '@/features/institution/institution-setup';
import type { SetupPermissions, SetupTab } from '@/features/institution/setup-config';
import { getServices, resetServicesForTests } from '@/services/registry';

const replace = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({
  usePathname: () => '/institution-setup',
  useRouter: () => ({ push: vi.fn(), replace }),
}));

const ALL = Object.fromEntries(PERMISSION_ACTIONS.map((action) => [action, true])) as Record<
  (typeof PERMISSION_ACTIONS)[number],
  boolean
>;
const OWNER: SetupPermissions = { ...ALL, brandingEdit: true, institutionWide: true, campusIds: [] };
const ADMIN: SetupPermissions = { ...OWNER, approve: false };
const AUDITOR: SetupPermissions = {
  ...ALL,
  create: false,
  edit: false,
  delete: false,
  approve: false,
  brandingEdit: false,
  institutionWide: true,
  campusIds: [],
};
const CAMPUS_ADMIN: SetupPermissions = { ...ADMIN, institutionWide: false, campusIds: ['cmp_city'] };

function grantsOf(permissions: SetupPermissions): Grant[] {
  const grants = PERMISSION_ACTIONS.filter((action) => permissions[action]).map(
    (action) => `institution:${action}` as Grant,
  );
  if (permissions.brandingEdit) grants.push('branding:view', 'branding:edit');
  return [...grants, 'users:view'];
}

function renderSetup({ permissions = OWNER, roleId = 'owner', roleName = 'Owner', tab = 'general' as SetupTab } = {}) {
  const campusScope = permissions.institutionWide ? ('all' as const) : permissions.campusIds;
  return render(
    <PortalProviders
      principal={{
        subject: `test-${roleId}`,
        displayName: `Test ${roleName}`,
        email: `${roleId}@school.example`,
        roleId,
        roleName,
        grants: grantsOf(permissions),
        campusScope,
      }}
    >
      <InstitutionSetup
        initialTab={tab}
        initialSection={null}
        permissions={permissions}
        roleId={roleId}
        roleName={roleName}
      />
    </PortalProviders>,
  );
}

beforeEach(() => {
  // jsdom does not implement modal dialogs.
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.removeAttribute('open');
  };
  window.localStorage.clear();
  resetServicesForTests();
  replace.mockReset();
});

describe('InstitutionSetup', () => {
  it('loads the saved profile into the General Information form', async () => {
    renderSetup();
    expect(await screen.findByLabelText(/Institution Name/)).toHaveValue('Greenwood International School');
    expect(screen.getByRole('heading', { level: 1, name: 'Institution Setup' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Page breadcrumb' })).toHaveTextContent(
      'DashboardInstitution SetupGeneral Information',
    );
    expect(screen.getByRole('button', { name: /Save Changes/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });

  it('blocks saving when required fields are empty or emails are invalid', async () => {
    const user = userEvent.setup();
    renderSetup();
    const name = await screen.findByLabelText(/Institution Name/);
    await user.clear(name);
    const email = screen.getByLabelText(/Official Email/);
    await user.clear(email);
    await user.type(email, 'not-an-email');
    await waitFor(() => expect(screen.getByRole('button', { name: /Save Changes/ })).toBeDisabled());
    expect(screen.getByText('Complete the required fields to continue.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: "Show what's missing" }));

    expect(await screen.findByText('Fix the highlighted fields before saving:')).toBeInTheDocument();
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText(/Some details need attention/)).toBeInTheDocument();
    const saved = await getServices()!.institution.getInstitution();
    expect(saved.name).toBe('Greenwood International School');
  });

  it('shows contact and address details on General Information, and jumps back there to an error', async () => {
    const user = userEvent.setup();
    renderSetup();
    expect(screen.queryByRole('tab', { name: /Contact Details|^Address/ })).not.toBeInTheDocument();
    expect(await screen.findByLabelText(/Address Line 1/)).toBeInTheDocument();
    const phone = screen.getByLabelText(/Contact Number/);
    await user.clear(phone);
    await user.type(phone, '12345');
    await user.click(screen.getByRole('tab', { name: /Policies & Preferences/ }));
    expect(screen.getByRole('button', { name: /Save Changes/ })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: "Show what's missing" }));

    expect(await screen.findByRole('tab', { name: /General Information/, selected: true })).toBeInTheDocument();
    expect(screen.getByLabelText(/Contact Number/)).toHaveAttribute('aria-invalid', 'true');
    expect(replace).toHaveBeenLastCalledWith('/institution-setup', { scroll: false });
  });

  it('saves valid changes to the shared mock record', async () => {
    const user = userEvent.setup();
    renderSetup();
    const name = await screen.findByLabelText(/Institution Name/);
    await user.clear(name);
    await user.type(name, 'Greenwood Global School');
    expect(screen.getByRole('status', { name: '' })).toHaveTextContent('Unsaved changes');
    await user.click(screen.getByRole('button', { name: /Save Changes/ }));

    expect(await screen.findByText('Institution settings saved')).toBeInTheDocument();
    await waitFor(async () =>
      expect((await getServices()!.institution.getInstitution()).name).toBe('Greenwood Global School'),
    );
    expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument();
  });

  it('discards unsaved edits on Cancel after confirmation', async () => {
    const user = userEvent.setup();
    renderSetup();
    const name = await screen.findByLabelText(/Institution Name/);
    await user.clear(name);
    await user.type(name, 'Temporary Name');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    const dialog = await screen.findByRole('dialog', { name: 'Discard unsaved changes?' });
    await user.click(within(dialog).getByRole('button', { name: 'Discard changes' }));

    expect(name).toHaveValue('Greenwood International School');
    expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument();
  });

  it('shows a read-only view to roles without the edit grant', async () => {
    renderSetup({ permissions: AUDITOR, roleId: 'auditor', roleName: 'Auditor' });
    const name = await screen.findByLabelText(/Institution Name/);
    expect(name).toBeDisabled();
    expect(screen.queryByRole('button', { name: /Save Changes/ })).not.toBeInTheDocument();
    expect(screen.getByText('Read-only')).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent('Your role (Auditor) can view Institution Setup');

    const summary = screen.getByText('Permission Summary').closest('[class*="rounded"]') as HTMLElement;
    expect(within(summary).getByRole('img', { name: 'View: allowed' })).toBeInTheDocument();
    expect(within(summary).getByRole('img', { name: 'Export: allowed' })).toBeInTheDocument();
    expect(within(summary).getByRole('img', { name: 'Edit: not allowed' })).toBeInTheDocument();
    expect(within(summary).getByRole('img', { name: 'Approve: not allowed' })).toBeInTheDocument();
  });

  it('hides create actions on list screens when the role cannot create', async () => {
    renderSetup({ permissions: AUDITOR, roleId: 'auditor', roleName: 'Auditor', tab: 'campuses' });
    expect(await screen.findByText('Main Campus')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Add Location/ })).not.toBeInTheDocument();
  });
});

describe('institution type', () => {
  it('shows only the identifiers that apply to the selected type, and keeps the others on save', async () => {
    const user = userEvent.setup();
    renderSetup();
    expect(await screen.findByRole('combobox', { name: /Education Board/ })).toHaveTextContent(/^CBSE/);
    expect(screen.getByLabelText(/UDISE Code/)).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: /^Degree College/ }));
    const dialog = await screen.findByRole('dialog', { name: /Change the institution type to Degree College/ });
    expect(dialog).toHaveTextContent('Nothing is deleted');
    await user.click(within(dialog).getByRole('button', { name: 'Change type' }));

    expect(screen.getByRole('radio', { name: /^Degree College/ })).toBeChecked();
    expect(screen.queryByLabelText(/Education Board/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/UDISE Code/)).not.toBeInTheDocument();
    const university = screen.getByLabelText(/Affiliating University/);
    expect(university).toBeRequired();

    await waitFor(() => expect(screen.getByRole('button', { name: /Save Changes/ })).toBeDisabled());
    await user.click(screen.getByRole('button', { name: "Show what's missing" }));
    expect(await screen.findByText('Fix the highlighted fields before saving:')).toBeInTheDocument();
    expect(university).toHaveAttribute('aria-invalid', 'true');

    await user.type(university, 'Osmania University');
    await waitFor(() => expect(screen.getByRole('button', { name: /Save Changes/ })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: /Save Changes/ }));
    expect(await screen.findByText('Institution settings saved')).toBeInTheDocument();
    const saved = await getServices()!.institution.getInstitution();
    expect(saved.type).toBe('degree-college');
    expect(saved.typeDetails['degree-college'].affiliatingUniversity).toBe('Osmania University');
    expect(saved.typeDetails.school.boardId).toBe('brd_cbse');
  });

  it('cancelling the confirmation keeps the current type', async () => {
    const user = userEvent.setup();
    renderSetup();
    await user.click(await screen.findByRole('radio', { name: /^University/ }));
    const dialog = await screen.findByRole('dialog', { name: /Change the institution type/ });
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('radio', { name: /^School/ })).toBeChecked();
    expect(screen.getByLabelText(/Education Board/)).toBeInTheDocument();
  });

  it('does not let roles without Approve change the type', async () => {
    renderSetup({ permissions: ADMIN, roleId: 'admin', roleName: 'Administrator' });
    expect(await screen.findByRole('radio', { name: /^Coaching/ })).toBeDisabled();
    expect(screen.getByText(/needs the Approve permission/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Institution Name/)).toBeEnabled();
  });

  it('keeps institution-wide settings read-only for campus-scoped users', async () => {
    renderSetup({ permissions: CAMPUS_ADMIN, roleId: 'admin', roleName: 'Administrator' });
    expect(await screen.findByLabelText(/Institution Name/)).toBeDisabled();
    expect(screen.getByRole('note')).toHaveTextContent('limited to specific campuses');
    expect(screen.queryByRole('button', { name: /Save Changes/ })).not.toBeInTheDocument();
  });
});

describe('academic structure, grading and entitlements', () => {
  it('loads a starter structure for a degree college and renames levels to the institution type', async () => {
    const user = userEvent.setup();
    renderSetup();
    await user.click(await screen.findByRole('radio', { name: /^Degree College/ }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Change type' }));
    await user.type(screen.getByLabelText(/Affiliating University/), 'Osmania University');
    await user.click(screen.getByRole('button', { name: /Save Changes/ }));
    await screen.findByText('Institution settings saved');

    await user.click(screen.getByRole('tab', { name: 'Academic Structure' }));
    expect(await screen.findByRole('heading', { name: 'Degree College Structure' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Structure levels' })).toHaveTextContent(
      'DepartmentsProgrammesYears / SemestersCourses & Electives',
    );
    await user.click(await screen.findByRole('button', { name: /Load Starter Structure/ }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Load structure' }));
    await waitFor(() =>
      expect(screen.getByRole('table', { name: 'Programmes' })).toHaveTextContent('B.Sc. Computer Science'),
    );
    expect(screen.queryByRole('button', { name: /Load Starter Structure/ })).not.toBeInTheDocument();
  });

  it('school structure keeps classes and sections, with examinations as a configurable level', async () => {
    const user = userEvent.setup();
    renderSetup({ tab: 'structure' });
    expect(await screen.findByRole('tab', { name: 'Classes & Sections', selected: true })).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Examinations' }));
    expect(await screen.findByRole('button', { name: /Add Examination/ })).toBeInTheDocument();
  });

  it('validates grade bands and saves grading rules', async () => {
    const user = userEvent.setup();
    renderSetup({ tab: 'grading' });
    const pass = await screen.findByLabelText(/Overall Pass Mark/);
    await user.clear(pass);
    await user.type(pass, '40');
    const from = screen.getByLabelText('Grade 1 from percent');
    await user.clear(from);
    await user.type(from, '95');
    await user.click(screen.getByRole('button', { name: /Save Grading/ }));
    expect(await screen.findByText(/Leaves a gap|must end at 100|Overlaps/)).toBeInTheDocument();
    expect((await getServices()!.institution.getGradingConfig()).passPercent).toBe(33);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Discard changes' }));
    await user.clear(screen.getByLabelText(/Overall Pass Mark/));
    await user.type(screen.getByLabelText(/Overall Pass Mark/), '40');
    await user.click(screen.getByRole('button', { name: /Save Grading/ }));
    expect(await screen.findByText('Grading rules saved')).toBeInTheDocument();
    expect((await getServices()!.institution.getGradingConfig()).passPercent).toBe(40);
  });

  it('shows entitlements read-only, with no way to grant them', async () => {
    renderSetup({ tab: 'entitlements' });
    expect(await screen.findByText(/cannot be changed here/)).toBeInTheDocument();
    expect(await screen.findAllByText('Included')).not.toHaveLength(0);
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Save/ })).not.toBeInTheDocument();
  });
});
