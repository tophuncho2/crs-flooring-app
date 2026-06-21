import { normalizeMoneyAmount } from "../../shared/money.js"
import type { FlooringPaymentDirection, Payment } from "./types.js"

type PaymentInput = {
  id: string
  paymentNumber: string
  amount: { toString(): string }
  direction: FlooringPaymentDirection
  paymentType: string | null
  paymentMethod: string | null
  paymentDate: Date | string | null
  memo: string | null
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
    paymentType: payment.paymentType ?? "",
    paymentMethod: payment.paymentMethod ?? "",
    paymentDate: toIso(payment.paymentDate),
    memo: payment.memo ?? "",
    createdAt: toIso(payment.createdAt),
    updatedAt: toIso(payment.updatedAt),
  }
}
