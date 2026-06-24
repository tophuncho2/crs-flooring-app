import type {
  CreateEntityRecordInput,
  UpdateEntityRecordInput,
} from "@builders/db"
import type { EntityDetail } from "@builders/domain"

export type CreateEntityUseCaseInput = CreateEntityRecordInput
export type UpdateEntityUseCaseInput = UpdateEntityRecordInput
export type EntityUseCaseResult = EntityDetail
