import type { CreatePaymentRecordInput, UpdatePaymentRecordInput } from "@builders/db"
import type { Payment } from "@builders/domain"

// The actor email (createdBy/updatedBy) is server-derived, threaded as an explicit
// `actorEmail` param — NOT part of the user-supplied input envelope. Strip the actor
// fields off the db input types here so the use-case inputs stay the validated subset.
export type CreatePaymentUseCaseInput = Omit<CreatePaymentRecordInput, "createdBy" | "updatedBy">
export type UpdatePaymentUseCaseInput = Omit<UpdatePaymentRecordInput, "updatedBy">
export type PaymentUseCaseResult = Payment
