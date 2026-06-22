import { normalizeMoneyAmount } from "../../shared/money.js"
import type { FlooringPaymentDirection, Payment } from "./types.js"

type PaymentInput = {
  id: string
  paymentNumber: string
  amount: { toString(): string }
  direction: FlooringPaymentDirection
  paymentDate: Date | string | null
  createdAt: Date | string
  updatedAt: Date | string
}

function toIso(value: Date | string | null): string {
  if (value == null) return ""
  return value instanceof Date ? value.toISOString() : value
}

export function normalizePayment(payment: PaymentInput): Payment {
  return {
    id: payment.id,
    paymentNumber: payment.paymentNumber,
    amount: normalizeMoneyAmount(payment.amount.toString()),
    direction: payment.direction,
    paymentDate: toIso(payment.paymentDate),
    createdAt: toIso(payment.createdAt),
    updatedAt: toIso(payment.updatedAt),
  }
}
