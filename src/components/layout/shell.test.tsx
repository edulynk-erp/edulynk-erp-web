import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { expectNoAxeViolations } from '../../../tests/support/axe';
import { NAVIGATION } from '@/config/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { LoginPanel } from '@/features/auth/login-panel';

const pathname = vi.hoisted(() => ({ current: '/dashboard' }));
vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }));

beforeEach(() => {
  pathname.current = '/dashboard';
});

describe('AppShell', () => {
  function renderShell() {
    return render(
      <AppShell groups={NAVIGATION} brandName="Test Institution" displayName="Test User" environmentLabel="Test">
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
    expect(screen.getByRole('heading', { name: 'Test Institution' })).toBeInTheDocument();
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
});
