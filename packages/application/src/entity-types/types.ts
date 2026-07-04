import type { CreateEntityTypeRecordInput, UpdateEntityTypeRecordInput } from "@builders/db"
import type { EntityType } from "@builders/domain"

// The actor email (createdBy/updatedBy) is server-derived, threaded as an explicit
// `actorEmail` param — NOT part of the user-supplied input envelope. Strip the actor
// fields off the db input types here so the use-case inputs stay the validated subset.
export type CreateEntityTypeUseCaseInput = Omit<CreateEntityTypeRecordInput, "createdBy" | "updatedBy">
export type UpdateEntityTypeUseCaseInput = Omit<UpdateEntityTypeRecordInput, "updatedBy">
export type EntityTypeUseCaseResult = EntityType
