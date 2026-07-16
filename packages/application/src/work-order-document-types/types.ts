import type {
  CreateWorkOrderDocumentTypeRecordInput,
  UpdateWorkOrderDocumentTypeRecordInput,
} from "@builders/db"
import type { WorkOrderDocumentType } from "@builders/domain"

// The actor email (createdBy/updatedBy) is server-derived, threaded as an explicit
// `actorEmail` param — NOT part of the user-supplied input envelope. Strip the actor
// fields off the db input types so the use-case inputs stay the validated subset.
export type CreateWorkOrderDocumentTypeUseCaseInput = Omit<
  CreateWorkOrderDocumentTypeRecordInput,
  "createdBy" | "updatedBy"
>
export type UpdateWorkOrderDocumentTypeUseCaseInput = Omit<
  UpdateWorkOrderDocumentTypeRecordInput,
  "updatedBy"
>
export type WorkOrderDocumentTypeUseCaseResult = WorkOrderDocumentType
