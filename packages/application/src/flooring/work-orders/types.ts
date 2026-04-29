import type { CreateWorkOrderRecordInput, UpdateWorkOrderRecordInput } from "@builders/db"
import type { WorkOrderDetail } from "@builders/domain"

export type CreateWorkOrderUseCaseInput = CreateWorkOrderRecordInput
export type UpdateWorkOrderUseCaseInput = UpdateWorkOrderRecordInput
export type WorkOrderUseCaseResult = WorkOrderDetail
