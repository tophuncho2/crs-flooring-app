import { DEFAULT_PALETTE_COLOR, type PaletteColor } from "../shared/palette.js"

export type PaymentPurpose = {
  id: string
  paymentPurposeNumber: string
  name: string
  color: PaletteColor
  createdAt: string
  updatedAt: string
  createdBy: string | null
  updatedBy: string | null
}

export type PaymentPurposeListRow = PaymentPurpose

/** Picker option — the slim shape the payment-purpose picker renders. */
export type PaymentPurposeOption = {
  id: string
  name: string
  color: PaletteColor
}

export type PaymentPurposeForm = {
  name: string
  color: PaletteColor
}

export const EMPTY_PAYMENT_PURPOSE_FORM: PaymentPurposeForm = {
  name: "",
  color: DEFAULT_PALETTE_COLOR,
}

export function toPaymentPurposeForm(paymentPurpose: PaymentPurpose): PaymentPurposeForm {
  return { name: paymentPurpose.name, color: paymentPurpose.color }
}
