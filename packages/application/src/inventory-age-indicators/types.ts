import type {
  CreateInventoryAgeIndicatorRecordInput,
  UpdateInventoryAgeIndicatorRecordInput,
} from "@builders/db"
import type { InventoryAgeIndicator } from "@builders/domain"

// The actor email (createdBy/updatedBy) is server-derived, threaded as an explicit
// `actorEmail` param — NOT part of the user-supplied input envelope. Strip the actor
// fields off the db input types here so the use-case inputs stay the validated subset.
export type CreateInventoryAgeIndicatorUseCaseInput = Omit<
  CreateInventoryAgeIndicatorRecordInput,
  "createdBy" | "updatedBy"
>
export type UpdateInventoryAgeIndicatorUseCaseInput = Omit<
  UpdateInventoryAgeIndicatorRecordInput,
  "updatedBy"
>
export type InventoryAgeIndicatorUseCaseResult = InventoryAgeIndicator
