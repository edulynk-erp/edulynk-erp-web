import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { RecordDialog, useReportBusy } from '@/features/institution/record-dialog';

function NameForm({ onBusy, onSave }: { onBusy: (busy: boolean) => void; onSave: (name: string) => void }) {
  const {
    register,
    handleSubmit,
    trigger,
    formState: { errors, isSubmitting, isValid },
  } = useForm({ defaultValues: { name: '' } });
  useReportBusy(isSubmitting, onBusy, isValid, trigger);
  return (
    <form id="name-form" onSubmit={handleSubmit(({ name }) => onSave(name))} noValidate>
      <FormField label="Name" error={errors.name?.message} required>
        <Input {...register('name', { required: 'Enter a name.' })} />
      </FormField>
    </form>
  );
}

function Harness({ onSave }: { onSave: (name: string) => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <RecordDialog open title="Add record" formId="name-form" submitting={busy} submitLabel="Add" onClose={() => {}}>
      <NameForm onBusy={setBusy} onSave={onSave} />
    </RecordDialog>
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
});

describe('RecordDialog', () => {
  it('keeps Save disabled until the required fields are complete, and can show what is missing', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<Harness onSave={onSave} />);
    const save = screen.getByRole('button', { name: 'Add' });
    await waitFor(() => expect(save).toBeDisabled());
    expect(screen.getByText('Complete the required fields to continue.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: "Show what's missing" }));
    expect(await screen.findByText('Enter a name.')).toBeInTheDocument();
    expect(screen.getByLabelText(/Name/)).toHaveFocus();

    await user.type(screen.getByLabelText(/Name/), 'Science Block');
    await waitFor(() => expect(save).toBeEnabled());
    expect(screen.queryByText('Complete the required fields to continue.')).not.toBeInTheDocument();
    await user.click(save);
    expect(onSave).toHaveBeenCalledWith('Science Block');
  });
});
