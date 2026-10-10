'use client';

import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  /** `drawer` slides in from the right edge; `dialog` is centred. */
  variant?: 'dialog' | 'drawer';
  className?: string;
}

/**
 * Modal built on the native `<dialog>` element: the browser provides the focus trap, Escape handling, inert background
 * and top layer, and nothing injects inline styles (the production CSP blocks them).
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  variant = 'dialog',
  className,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className={cn(
        'bg-card p-0 text-card-foreground shadow-xl backdrop:bg-navy/45',
        variant === 'dialog'
          ? 'm-auto w-[calc(100%-2rem)] max-w-lg rounded-xl border'
          : 'mt-0 mr-0 mb-0 ml-auto h-dvh max-h-dvh w-full max-w-xl border-l',
        className,
      )}
    >
      {open ? (
        <div className={cn('flex flex-col', variant === 'drawer' && 'h-full')}>
          <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
            <div className="space-y-1">
              <h2 id={titleId} className="text-base font-semibold">
                {title}
              </h2>
              {description ? (
                <div id={descriptionId} className="text-sm text-muted-foreground">
                  {description}
                </div>
              ) : null}
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
              <X />
            </Button>
          </div>
          {children ? (
            <div className={cn('px-5 py-4', variant === 'drawer' && 'flex-1 overflow-y-auto')}>{children}</div>
          ) : null}
          {footer ? <div className="flex flex-wrap justify-end gap-2 border-t px-5 py-3">{footer}</div> : null}
        </div>
      ) : null}
    </dialog>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  destructive = false,
  pending = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={pending ? () => {} : onCancel}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="outline" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
          <Button variant={destructive ? 'destructive' : 'default'} onClick={onConfirm} loading={pending}>
            {pending ? 'Working…' : confirmLabel}
          </Button>
        </>
      }
    />
  );
}
