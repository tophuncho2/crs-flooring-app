import { toIsoTimestamp } from "../shared/date-format.js"
import { normalizeMoneyAmount } from "../shared/money.js"
import { normalizePhoneNumber } from "../shared/phone.js"
import type { PaletteColor } from "../shared/palette.js"
import type { EntityTypeRef } from "../entities/types.js"
import type { FlooringPaymentDirection, Payment } from "./types.js"

type PaymentInput = {
  id: string
  paymentNumber: string
  paymentNumberInt?: number | null
  amount: { toString(): string }
  direction: FlooringPaymentDirection
  color: PaletteColor
  paymentMethod?: string | null
  storePhone?: string | null
  receiptNumber?: string | null
  storeAddress?: string | null
  storeNumber?: string | null
  internalNotes?: string | null
  paymentDate: Date | string | null
  entityId?: string | null
  workOrderId?: string | null
  paymentPurposeId?: string | null
  /** Read-only hydration off the links (detail read only); absent on list rows. */
  entityName?: string | null
  workOrderNumber?: string | null
  workOrderLabel?: string | null
  entityType?: EntityTypeRef | null
  paymentPurposeName?: string | null
  paymentPurposeColor?: PaletteColor | null
  createdAt: Date | string
  updatedAt: Date | string
  createdBy: string | null
  updatedBy: string | null
}

export function normalizePayment(payment: PaymentInput): Payment {
  return {
    id: payment.id,
    paymentNumber: payment.paymentNumber,
    paymentNumberInt: payment.paymentNumberInt ?? undefined,
    amount: normalizeMoneyAmount(payment.amount.toString()),
    direction: payment.direction,
    color: payment.color,
    paymentMethod: payment.paymentMethod ?? "",
    storePhone: normalizePhoneNumber(payment.storePhone ?? ""),
    receiptNumber: payment.receiptNumber ?? "",
    storeAddress: payment.storeAddress ?? "",
    storeNumber: payment.storeNumber ?? "",
    internalNotes: payment.internalNotes ?? "",
    paymentDate: toIsoTimestamp(payment.paymentDate),
    entityId: payment.entityId ?? null,
    workOrderId: payment.workOrderId ?? null,
    paymentPurposeId: payment.paymentPurposeId ?? null,
    entityName: payment.entityName ?? null,
    workOrderNumber: payment.workOrderNumber ?? null,
    workOrderLabel: payment.workOrderLabel ?? null,
    entityType: payment.entityType ?? null,
    paymentPurposeName: payment.paymentPurposeName ?? null,
    paymentPurposeColor: payment.paymentPurposeColor ?? null,
    createdAt: toIsoTimestamp(payment.createdAt),
    updatedAt: toIsoTimestamp(payment.updatedAt),
    createdBy: payment.createdBy,
    updatedBy: payment.updatedBy,
  }
}
