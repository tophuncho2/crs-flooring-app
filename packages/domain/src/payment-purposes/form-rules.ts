import {
  PAYMENT_PURPOSE_NAME_REQUIRED_MESSAGE,
  PAYMENT_PURPOSE_NAME_TOO_LONG_MESSAGE,
} from "./error-messages.js"
import { isPaletteColor, PALETTE_COLOR_INVALID_MESSAGE } from "../shared/palette.js"
import type { PaymentPurposeForm } from "./types.js"

export const PAYMENT_PURPOSE_NAME_MAX_LENGTH = 30

export function validatePaymentPurposeForm(input: PaymentPurposeForm) {
  if (!input.name.trim()) return PAYMENT_PURPOSE_NAME_REQUIRED_MESSAGE
  if (input.name.trim().length > PAYMENT_PURPOSE_NAME_MAX_LENGTH)
    return PAYMENT_PURPOSE_NAME_TOO_LONG_MESSAGE
  if (!isPaletteColor(input.color)) return PALETTE_COLOR_INVALID_MESSAGE
  return ""
}
