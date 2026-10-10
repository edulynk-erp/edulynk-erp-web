import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';
import { expectNoAxeViolations } from '../../../tests/support/axe';
import { Label } from '@/components/ui/input';
import { Select, SelectMenu } from '@/components/ui/select-menu';

const OPTIONS = [
  { value: '', label: 'All Roles' },
  { value: 'principal', label: 'Principal' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'accountant', label: 'Accountant' },
];

function Harness({ onChange = vi.fn() }: { onChange?: (value: string) => void }) {
  const [value, setValue] = useState('');
  return (
    <main>
      <SelectMenu
        aria-label="Filter by role"
        value={value}
        options={OPTIONS}
        onValueChange={(next) => {
          setValue(next);
          onChange(next);
        }}
      />
      <button type="button">Outside</button>
    </main>
  );
}

describe('SelectMenu', () => {
  it('opens a listbox on click and selects an option', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const trigger = screen.getByRole('combobox', { name: 'Filter by role' });
    expect(trigger).toHaveTextContent('All Roles');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('option', { name: 'All Roles' })).toHaveAttribute('aria-selected', 'true');
    await expectNoAxeViolations(document.body);

    await user.click(screen.getByRole('option', { name: 'Teacher' }));
    expect(onChange).toHaveBeenCalledWith('teacher');
    expect(trigger).toHaveTextContent('Teacher');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('supports keyboard navigation, type-ahead and Escape', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const trigger = screen.getByRole('combobox', { name: 'Filter by role' });
    trigger.focus();

    await user.keyboard('{ArrowDown}');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(trigger.getAttribute('aria-activedescendant')).toBe(screen.getByRole('option', { name: 'Teacher' }).id);
    await user.keyboard('{Enter}');
    expect(onChange).toHaveBeenLastCalledWith('teacher');

    await user.keyboard('{ArrowDown}{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(onChange).toHaveBeenCalledTimes(1);

    await user.keyboard('a');
    expect(onChange).toHaveBeenLastCalledWith('accountant');
  });

  it('closes when clicking outside without changing the value', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await user.click(screen.getByRole('combobox', { name: 'Filter by role' }));
    await user.click(screen.getByRole('button', { name: 'Outside' }));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });
});

function FormHarness({ onSubmit }: { onSubmit: (values: { role: string }) => void }) {
  const { register, handleSubmit, reset, setFocus, formState } = useForm({
    defaultValues: { role: 'teacher' },
    mode: 'onTouched',
  });
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Label htmlFor="role">Role</Label>
      <Select
        id="role"
        aria-invalid={formState.errors.role ? true : undefined}
        {...register('role', { required: 'Pick a role' })}
      >
        <option value="">Choose…</option>
        <option value="principal">Principal</option>
        <option value="teacher">Teacher</option>
      </Select>
      {formState.errors.role ? <p>{formState.errors.role.message}</p> : null}
      <button type="button" onClick={() => reset({ role: 'principal' })}>
        Reset
      </button>
      <button type="button" onClick={() => setFocus('role')}>
        Focus
      </button>
      <button type="submit">Save</button>
    </form>
  );
}

describe('Select', () => {
  it('works as a react-hook-form registered field', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<FormHarness onSubmit={onSubmit} />);
    const field = screen.getByRole('combobox', { name: 'Role' });
    expect(field).toHaveTextContent('Teacher');

    await user.click(field);
    await user.click(screen.getByRole('option', { name: 'Principal' }));
    expect(field).toHaveTextContent('Principal');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSubmit).toHaveBeenLastCalledWith({ role: 'principal' }, expect.anything());

    await user.click(field);
    await user.click(screen.getByRole('option', { name: 'Choose…' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Pick a role')).toBeInTheDocument();
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(field).toHaveFocus();

    await user.click(screen.getByRole('button', { name: 'Reset' }));
    expect(field).toHaveTextContent('Principal');
    await user.click(screen.getByRole('button', { name: 'Focus' }));
    expect(field).toHaveFocus();
  });
});
