import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SetPasswordForm } from '@/features/onboarding/set-password-form';

describe('SetPasswordForm', () => {
  it('updates validation messages while the user types, without waiting for blur or submit', async () => {
    const user = userEvent.setup();
    render(<SetPasswordForm email="anita@school.example" submitLabel="Set password" onValid={vi.fn()} />);
    const password = screen.getByLabelText(/^New password/);
    const confirm = screen.getByLabelText(/^Confirm password/);

    await user.type(password, 'short');
    expect(screen.getByText(/^Password needs:/)).toBeInTheDocument();
    expect(password).toHaveAttribute('aria-invalid', 'true');

    await user.clear(password);
    await user.type(password, 'Example@Pass1');
    expect(screen.queryByText(/^Password needs:/)).not.toBeInTheDocument();
    expect(password).not.toHaveAttribute('aria-invalid', 'true');

    await user.type(confirm, 'Example@Pass');
    expect(screen.getByText('Passwords do not match.')).toBeInTheDocument();
    await user.type(confirm, '1');
    expect(screen.queryByText('Passwords do not match.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Set password' })).toBeEnabled();
  });
});
