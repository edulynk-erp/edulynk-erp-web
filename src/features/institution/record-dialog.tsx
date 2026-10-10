'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { FieldValues, UseFormSetError } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { ConfirmDialog, Dialog } from '@/components/ui/dialog';
import { IncompleteFormHint } from '@/components/ui/form-status';
import { useToast } from '@/components/ui/toast';
import { applyFieldErrors } from '@/features/institution/setup-ui';
import { describeError } from '@/services/provider';

/** `null` = closed, `{ record: null }` = creating, `{ record }` = editing. */
export type EditorState<T> = { readonly record: T | null } | null;

interface Readiness {
  /** False while required fields are empty or invalid. */
  readonly ready: boolean;
  /** Validates the whole form so every problem is marked. */
  readonly reveal?: () => void;
}

const ReadinessContext = createContext<((readiness: Readiness) => void) | null>(null);

export function RecordDialog({
  open,
  title,
  description,
  formId,
  submitting,
  submitLabel,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  description?: string;
  formId: string;
  submitting: boolean;
  submitLabel: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const [readiness, setReadiness] = useState<Readiness>({ ready: true });
  const blocked = !readiness.ready && !submitting;
  return (
    <Dialog
      open={open}
      onClose={submitting ? () => {} : onClose}
      title={title}
      description={description}
      className="max-w-2xl"
      footer={
        <>
          {blocked ? <IncompleteFormHint onReveal={readiness.reveal} className="mr-auto self-center" /> : null}
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={submitting} disabled={blocked}>
            {submitting ? 'Saving…' : submitLabel}
          </Button>
        </>
      }
    >
      <ReadinessContext value={setReadiness}>{children}</ReadinessContext>
    </Dialog>
  );
}

/**
 * Lets a form inside `RecordDialog` drive the footer: the pending state, and (with react-hook-form `isValid` and
 * `trigger`) keeping Save disabled until the required fields are complete.
 */
export function useReportBusy(
  busy: boolean,
  onBusy: (busy: boolean) => void,
  ready = true,
  trigger?: (name?: undefined, options?: { shouldFocus?: boolean }) => unknown,
): void {
  useEffect(() => {
    onBusy(busy);
    return () => onBusy(false);
  }, [busy, onBusy]);
  const report = useContext(ReadinessContext);
  const reveal = useCallback(() => void trigger?.(undefined, { shouldFocus: true }), [trigger]);
  useEffect(() => {
    report?.({ ready, reveal: trigger ? reveal : undefined });
    return () => report?.({ ready: true });
  }, [ready, reveal, trigger, report]);
}

/** Runs a create/update call, mapping field errors onto the form and reporting the outcome as a toast. */
export function useRecordSubmit() {
  const toast = useToast();
  return async function submit<T extends FieldValues>({
    run,
    setError,
    fields,
    success,
    failure,
    onDone,
  }: {
    run: () => Promise<unknown>;
    setError: UseFormSetError<T>;
    fields: readonly string[];
    success: string;
    failure: string;
    onDone: () => void;
  }): Promise<void> {
    try {
      await run();
      toast.notify({ tone: 'success', title: success });
      onDone();
    } catch (error) {
      applyFieldErrors(error, setError, fields);
      toast.notify({ tone: 'error', title: failure, description: describeError(error) });
    }
  };
}

/** Delete confirmation that keeps itself open (with the reason) when the service refuses. */
export function DeleteRecordDialog<T>({
  record,
  title,
  description,
  onCancel,
  onDelete,
  success,
}: {
  record: T | null;
  title: string;
  description: ReactNode;
  onCancel: () => void;
  onDelete: (record: T) => Promise<void>;
  success: string;
}) {
  const toast = useToast();
  const [pending, setPending] = useState(false);
  const confirm = async () => {
    if (record === null) return;
    setPending(true);
    try {
      await onDelete(record);
      toast.notify({ tone: 'success', title: success });
      onCancel();
    } catch (error) {
      toast.notify({ tone: 'error', title: 'Not deleted', description: describeError(error) });
    } finally {
      setPending(false);
    }
  };
  return (
    <ConfirmDialog
      open={record !== null}
      title={title}
      description={description}
      confirmLabel="Delete"
      destructive
      pending={pending}
      onCancel={onCancel}
      onConfirm={() => void confirm()}
    />
  );
}
