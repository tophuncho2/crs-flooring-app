import type { Payment, PaymentForm } from "@builders/domain"

/** What the standalone record page opens with: a blank create, or an edit row. */
export type PaymentRecordOpenSpec = { mode: "create" } | { mode: "edit"; payment: Payment }

export type PaymentRecordForm = PaymentForm
