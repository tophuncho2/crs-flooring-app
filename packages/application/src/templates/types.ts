import type { CreateTemplateRecordInput, UpdateTemplateRecordInput } from "@builders/db"
import type { TemplateDetail } from "@builders/domain"

// Actor columns (createdBy/updatedBy) are never user input — the use case stamps
// them from a separate guarded `actorEmail` param, so they're carved off here.
export type CreateTemplateUseCaseInput = Omit<
  CreateTemplateRecordInput,
  "createdBy" | "updatedBy"
>
export type UpdateTemplateUseCaseInput = Omit<UpdateTemplateRecordInput, "updatedBy">
export type TemplateUseCaseResult = TemplateDetail
