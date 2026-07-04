import type { CreateWorkOrderRecordInput, UpdateWorkOrderRecordInput } from "@builders/db"
import type { WorkOrderDetail } from "@builders/domain"

// Actor columns are stamped by the use case from a guarded `actorEmail` param —
// never supplied by the client, so they are omitted from the input envelope.
export type CreateWorkOrderUseCaseInput = Omit<CreateWorkOrderRecordInput, "createdBy" | "updatedBy">
export type UpdateWorkOrderUseCaseInput = Omit<UpdateWorkOrderRecordInput, "updatedBy">
export type WorkOrderUseCaseResult = WorkOrderDetail
