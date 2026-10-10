import type { IsoDate, Rupees, YearScoped } from '@/domain/common';

export const INVOICE_STATUSES = ['paid', 'partially-paid', 'due', 'overdue'] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export interface FeeInvoice extends YearScoped {
  readonly id: string;
  readonly invoiceNo: string;
  readonly studentId: string;
  readonly term: 1 | 2 | 3;
  readonly amount: Rupees;
  readonly paid: Rupees;
  readonly issuedOn: IsoDate;
  readonly dueOn: IsoDate;
  readonly lastPaymentOn: IsoDate | null;
}

export function invoiceStatus(invoice: FeeInvoice, today: IsoDate): InvoiceStatus {
  if (invoice.paid >= invoice.amount) return 'paid';
  if (invoice.dueOn < today) return 'overdue';
  return invoice.paid > 0 ? 'partially-paid' : 'due';
}
