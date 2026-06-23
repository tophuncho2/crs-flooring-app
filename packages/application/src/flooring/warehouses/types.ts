import type {
  CreateWarehouseInput as CreateWarehouseRecordInput,
  UpdateWarehouseInput as UpdateWarehouseRecordInput,
  WarehouseRecord,
} from "@builders/db"

// The actor email (createdBy/updatedBy) is server-derived, threaded as an explicit
// `actorEmail` param — NOT part of the user-supplied input envelope. Strip the actor
// fields off the db input types here so the use-case inputs stay the validated subset.
export type CreateWarehouseInput = Omit<CreateWarehouseRecordInput, "createdBy" | "updatedBy">
export type UpdateWarehouseInput = Omit<UpdateWarehouseRecordInput, "updatedBy">

export type WarehouseResult = WarehouseRecord
