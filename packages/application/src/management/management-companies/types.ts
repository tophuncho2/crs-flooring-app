import type {
  CreateManagementCompanyRecordInput,
  UpdateManagementCompanyRecordInput,
} from "@builders/db"
import type { ManagementCompanyDetail } from "@builders/domain"

export type CreateManagementCompanyUseCaseInput = CreateManagementCompanyRecordInput
export type UpdateManagementCompanyUseCaseInput = UpdateManagementCompanyRecordInput
export type ManagementCompanyUseCaseResult = ManagementCompanyDetail
