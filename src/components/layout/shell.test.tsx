import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { expectNoAxeViolations } from '../../../tests/support/axe';
import { NAVIGATION, navigationFor } from '@/config/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { LoginPanel } from '@/features/auth/login-panel';

const pathname = vi.hoisted(() => ({ current: '/dashboard' }));
vi.mock('next/navigation', () => ({
  usePathname: () => pathname.current,
  useRouter: () => ({ push: vi.fn() }),
}));

beforeEach(() => {
  pathname.current = '/dashboard';
});

describe('AppShell', () => {
  function renderShell(groups = NAVIGATION) {
    return render(
      <AppShell
        groups={groups}
        brandName="Test Institution"
        displayName="Test User"
        roleName="Teacher"
        environmentLabel="Test"
      >
        <h1>Dashboard</h1>
      </AppShell>,
    );
  }

  it('shows the brand, marks the active page and renders breadcrumbs', () => {
    renderShell();
    expect(screen.getByRole('link', { name: 'Test Institution' })).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(within(nav).getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toHaveTextContent('Dashboard');
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('marks the parent module active on nested routes', () => {
    pathname.current = '/users/new';
    renderShell();
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(within(nav).getByRole('link', { name: 'Users & Access' })).toHaveAttribute('aria-current', 'page');
  });

  it('only lists modules the role can view', () => {
    renderShell(navigationFor(['dashboard:view', 'attendance:view']));
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(
      within(nav)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['Dashboard', 'Attendance']);
  });

  it('hides demo controls when the demo adapter is not active', () => {
    renderShell();
    expect(screen.queryByRole('button', { name: /Demo mode/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/Demo mode: simulated data/)).not.toBeInTheDocument();
  });

  it('toggles the mobile navigation disclosure', async () => {
    renderShell();
    const toggle = screen.getByRole('button', { name: 'Open navigation' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(toggle);
    expect(screen.getByRole('button', { name: 'Close navigation' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getAllByRole('navigation', { name: 'Main' })).toHaveLength(2);
  });

  it('has no axe violations', async () => {
    const { container } = renderShell();
    await expectNoAxeViolations(container);
  });
});

describe('LoginPanel', () => {
  it('explains that sign-in is unavailable when no identity provider is configured', async () => {
    const { container } = render(<LoginPanel brandName="Test Institution" step={{ kind: 'unavailable' }} />);
    expect(screen.getByRole('heading', { name: 'Welcome Back' })).toBeInTheDocument();
    expect(screen.getByText(/Sign in to your Test Institution account/)).toBeInTheDocument();
    expect(screen.getByText(/Sign-in is not configured/)).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    await expectNoAxeViolations(container);
  });

  it('shows notices with the right role', () => {
    render(
      <LoginPanel
        brandName="Edulynk"
        step={{ kind: 'unavailable' }}
        notice={{ tone: 'info', message: 'You have been signed out.' }}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('You have been signed out.');
  });

  it('refuses unsafe redirect URLs from an adapter', () => {
    render(<LoginPanel brandName="Edulynk" step={{ kind: 'redirect', url: 'javascript:alert(1)' }} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('Sign-in is misconfigured.')).toBeInTheDocument();
  });

  it('renders a demo credential form that posts to the server and labels the demo as simulated', async () => {
    const { container } = render(
      <LoginPanel
        brandName="Edulynk"
        next="/users"
        step={{
          kind: 'demo-credentials',
          password: 'Example@Pass1',
          accounts: [
            { email: 'owner@school.example', displayName: 'Owner Person', roleId: 'owner', roleName: 'Owner' },
          ],
        }}
      />,
    );
    const form = container.querySelector('form');
    expect(form).toHaveAttribute('method', 'post');
    expect(form).toHaveAttribute('action', '/auth/sign-in');
    expect(container.querySelector('input[name="next"]')).toHaveValue('/users');
    expect(screen.getByRole('heading', { name: /Demo sign-in \(simulated\)/ })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('combobox', { name: 'Fill in a demo account' }));
    await userEvent.click(screen.getByRole('option', { name: 'Owner · Owner Person' }));
    expect(screen.getByLabelText('Email / Mobile Number')).toHaveValue('owner@school.example');
    expect(screen.getByLabelText('Password')).toHaveValue('Example@Pass1');
    await expectNoAxeViolations(container);
  });
});
