import { toIsoTimestamp } from "../shared/date-format.js"
import type { PaymentPurpose, PaymentPurposeOption } from "./types.js"
import type { PaletteColor } from "../shared/palette.js"

type PaymentPurposeInput = {
  id: string
  paymentPurposeNumber: string
  name: string
  color: PaletteColor
  createdAt: Date | string
  updatedAt: Date | string
  createdBy: string | null
  updatedBy: string | null
}

export function normalizePaymentPurpose(paymentPurpose: PaymentPurposeInput): PaymentPurpose {
  return {
    id: paymentPurpose.id,
    paymentPurposeNumber: paymentPurpose.paymentPurposeNumber,
    name: paymentPurpose.name,
    color: paymentPurpose.color,
    createdAt: toIsoTimestamp(paymentPurpose.createdAt),
    updatedAt: toIsoTimestamp(paymentPurpose.updatedAt),
    createdBy: paymentPurpose.createdBy,
    updatedBy: paymentPurpose.updatedBy,
  }
}

export function normalizePaymentPurposeOption(input: {
  id: string
  name: string
  color: PaletteColor
}): PaymentPurposeOption {
  return { id: input.id, name: input.name, color: input.color }
}
