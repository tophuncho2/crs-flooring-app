import type { CreatePaymentRecordInput, UpdatePaymentRecordInput } from "@builders/db"
import type { Payment } from "@builders/domain"

export type CreatePaymentUseCaseInput = CreatePaymentRecordInput
export type UpdatePaymentUseCaseInput = UpdatePaymentRecordInput
export type PaymentUseCaseResult = Payment
