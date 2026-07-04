import type {
  CreateEntityRecordInput,
  UpdateEntityRecordInput,
} from "@builders/db"
import type { EntityDetail } from "@builders/domain"

// Actor columns (createdBy/updatedBy) are never user input — the use case stamps
// them from a separate guarded `actorEmail` param, so they're carved off here.
export type CreateEntityUseCaseInput = Omit<
  CreateEntityRecordInput,
  "createdBy" | "updatedBy"
>
export type UpdateEntityUseCaseInput = Omit<UpdateEntityRecordInput, "updatedBy">
export type EntityUseCaseResult = EntityDetail
