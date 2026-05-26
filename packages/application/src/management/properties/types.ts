import type { CreatePropertyRecordInput, UpdatePropertyRecordInput } from "@builders/db"
import type { PropertyDetailRecord } from "@builders/domain"

// `nameNormalized` is derived from `name` inside the use case, never supplied
// by the API caller — exclude it from the use-case input contract.
export type CreatePropertyUseCaseInput = Omit<CreatePropertyRecordInput, "nameNormalized">
export type UpdatePropertyUseCaseInput = Omit<UpdatePropertyRecordInput, "nameNormalized">
export type PropertyUseCaseResult = PropertyDetailRecord
