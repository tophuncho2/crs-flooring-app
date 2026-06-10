import type {
  CreateLaborPaymentRecordInput,
  UpdateLaborPaymentRecordInput,
} from "@builders/db"
import type { LaborPayment } from "@builders/domain"

export type CreateLaborPaymentUseCaseInput = CreateLaborPaymentRecordInput
export type UpdateLaborPaymentUseCaseInput = UpdateLaborPaymentRecordInput
export type LaborPaymentUseCaseResult = LaborPayment
