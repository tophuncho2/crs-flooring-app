import type { CreatePropertyRecordInput, UpdatePropertyRecordInput } from "@builders/db"
import type { PropertyDetailRecord } from "@builders/domain"

export type CreatePropertyUseCaseInput = CreatePropertyRecordInput
export type UpdatePropertyUseCaseInput = UpdatePropertyRecordInput
export type PropertyUseCaseResult = PropertyDetailRecord
