import type {
  CreatePaymentPurposeRecordInput,
  UpdatePaymentPurposeRecordInput,
} from "@builders/db"
import type { PaymentPurpose } from "@builders/domain"

// The actor email (createdBy/updatedBy) is server-derived, threaded as an explicit
// `actorEmail` param — NOT part of the user-supplied input envelope. Strip the actor
// fields off the db input types here so the use-case inputs stay the validated subset.
export type CreatePaymentPurposeUseCaseInput = Omit<
  CreatePaymentPurposeRecordInput,
  "createdBy" | "updatedBy"
>
export type UpdatePaymentPurposeUseCaseInput = Omit<UpdatePaymentPurposeRecordInput, "updatedBy">
export type PaymentPurposeUseCaseResult = PaymentPurpose
