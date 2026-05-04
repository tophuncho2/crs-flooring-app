import { z } from "zod"
import { InventoryExecutionError } from "@builders/application"
import type { UpdateInventoryInput } from "@builders/application"

function optionalString(value: unknown, field: string): string {
  if (value === undefined || value === null) return ""
  if (typeof value !== "string") {
    throw new InventoryExecutionError({
      code: "INVENTORY_VALIDATION_FAILED",
      message: `${field} must be a string`,
      status: 400,
      field,
    })
  }
  return value
}

function requireBoolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") {
    throw new InventoryExecutionError({
      code: "INVENTORY_VALIDATION_FAILED",
      message: `${field} must be true or false`,
      status: 400,
      field,
    })
  }
  return value
}

// --- Picker / options search validator ---

const OPTIONS_DEFAULT_TAKE = 20
const OPTIONS_MAX_TAKE = 50

const inventorySearchQuerySchema = z.object({
  warehouseId: z.string().min(1, "warehouseId is required"),
  productId: z.string().optional(),
  sectionId: z.string().optional(),
  locationId: z.string().optional(),
  search: z.string().optional(),
  take: z.coerce
    .number()
    .int()
    .min(1)
    .max(OPTIONS_MAX_TAKE)
    .default(OPTIONS_DEFAULT_TAKE),
})

export type ValidatedInventorySearchQuery = {
  warehouseId: string
  productId?: string
  sectionId?: string
  locationId?: string
  search?: string
  take: number
}

export function validateInventorySearchQuery(
  searchParams: URLSearchParams,
): ValidatedInventorySearchQuery {
  const raw: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    raw[key] = value
  })

  const parseResult = inventorySearchQuerySchema.safeParse(raw)
  if (!parseResult.success) {
    const issue = parseResult.error.issues[0]
    throw new InventoryExecutionError({
      code: "INVENTORY_VALIDATION_FAILED",
      message: issue?.message ?? "Invalid inventory options query",
      status: 400,
      ...(issue?.path[0] ? { field: String(issue.path[0]) } : {}),
    })
  }

  const parsed = parseResult.data
  const trimSearch = parsed.search?.trim()
  const trimProduct = parsed.productId?.trim()
  const trimSection = parsed.sectionId?.trim()
  const trimLocation = parsed.locationId?.trim()
  return {
    warehouseId: parsed.warehouseId.trim(),
    ...(trimProduct ? { productId: trimProduct } : {}),
    ...(trimSection ? { sectionId: trimSection } : {}),
    ...(trimLocation ? { locationId: trimLocation } : {}),
    ...(trimSearch ? { search: trimSearch } : {}),
    take: parsed.take,
  }
}

export function validateUpdateInventoryInput(body: Record<string, unknown>): UpdateInventoryInput {
  // Cost and freight are intentionally NOT accepted here. They are editable only
  // from the imports record view's staged-inventory-rows section while
  // `isImported = false`. Once a row is imported, cost/freight are locked to
  // preserve the accounting snapshot that cut logs reference.
  const input: UpdateInventoryInput = {}
  if (body.itemNumber !== undefined) input.itemNumber = optionalString(body.itemNumber, "itemNumber")
  if (body.dyeLot !== undefined) input.dyeLot = optionalString(body.dyeLot, "dyeLot")
  if (body.warehouseId !== undefined) input.warehouseId = optionalString(body.warehouseId, "warehouseId")
  if (body.locationId !== undefined) input.locationId = optionalString(body.locationId, "locationId")
  if (body.notes !== undefined) input.notes = optionalString(body.notes, "notes")
  if (body.isArchived !== undefined) input.isArchived = requireBoolean(body.isArchived, "isArchived")
  return input
}
