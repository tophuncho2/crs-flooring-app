import {
  Prisma,
  getInventoryById,
  getProductById,
  getUnitOfMeasureById,
  getWarehouseById,
  insertInventoryRow,
  withDatabaseTransaction,
} from "@builders/db"
import {
  buildCreatedInventoryInsert,
  describeInventoryCreateIssues,
  validateCreateInventoryEdits,
} from "@builders/domain"
import { assertActorEmail } from "../shared/assert-actor-email.js"
import { guardUnitsExist } from "../shared/guard-units-exist.js"
import { InventoryExecutionError } from "./errors.js"
import type { CreateInventoryInput, InventoryResult } from "./types.js"

export async function createInventoryUseCase(
  input: CreateInventoryInput,
  actorEmail: string,
  client?: Prisma.TransactionClient,
): Promise<InventoryResult> {
  assertActorEmail(actorEmail, "createInventoryUseCase")

  const issues = validateCreateInventoryEdits(input)
  if (issues.length > 0) {
    throw new InventoryExecutionError({
      code: "INVENTORY_VALIDATION_FAILED",
      message: describeInventoryCreateIssues(issues),
      status: 422,
      payload: { issues },
    })
  }

  // Existence guards read on the pool — they're pure validation (no relation data
  // is consumed), and reading them relation-rich on the tx connection would trip
  // Prisma's concurrent relation sub-queries on the single pinned connection. The
  // insert FK-guards regardless, so the tiny check→insert window is safe.
  const product = await getProductById(input.productId)
  if (!product) {
    throw new InventoryExecutionError({
      code: "INVENTORY_PRODUCT_NOT_FOUND",
      message: "Product not found.",
      status: 404,
    })
  }

  const warehouse = await getWarehouseById(input.warehouseId)
  if (!warehouse) {
    throw new InventoryExecutionError({
      code: "INVENTORY_WAREHOUSE_NOT_FOUND",
      message: "Warehouse not found.",
      status: 404,
    })
  }

  // Unit FK is required on create — assert it still exists before insert.
  await guardUnitsExist(
    [input.unitId],
    (unitId) => getUnitOfMeasureById(unitId),
    (unitId) =>
      new InventoryExecutionError({
        code: "INVENTORY_UNIT_NOT_FOUND",
        message: "Selected unit was not found.",
        status: 404,
        field: "unitId",
        payload: { unitId },
      }),
  )

  // Unit is the FK from the create form (seeded from the product, overridable).
  // No longer derived from the product's retiring snapshot strings (UoM epic 2B).
  const fields = buildCreatedInventoryInsert(input)

  // Pin createdAt to the creation instant — it's the row's FIFO position.
  const now = new Date()
  const created = await withDatabaseTransaction(async (tx) => {
    const c = client ?? tx
    return insertInventoryRow(c, {
      ...fields,
      createdAt: now,
      createdBy: actorEmail,
      updatedBy: actorEmail,
    })
  })

  // Enrich the full record on the pool after the transaction commits — the
  // multi-relation read must not run on the pinned tx connection.
  const record = await getInventoryById(created.id)
  if (!record) {
    throw new Error(`createInventoryUseCase: inventory ${created.id} not found after insert`)
  }
  return record
}
