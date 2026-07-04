import type { CreatePropertyRecordInput, UpdatePropertyRecordInput } from "@builders/db"
import type { PropertyDetailRecord } from "@builders/domain"

// Actor columns (createdBy/updatedBy) are never user input — the use case stamps
// them from a separate guarded `actorEmail` param, so they're carved off here.
export type CreatePropertyUseCaseInput = Omit<
  CreatePropertyRecordInput,
  "createdBy" | "updatedBy"
>
export type UpdatePropertyUseCaseInput = Omit<UpdatePropertyRecordInput, "updatedBy">
export type PropertyUseCaseResult = PropertyDetailRecord
