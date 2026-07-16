import {
  Prisma,
  entityExists,
  getImportById,
  getImportLinkState,
  getImportPrimaryStateById,
  getWarehouseById,
  lockImportRow,
  updateImportRecord,
  withDatabaseTransaction,
  type UpdateImportRecordInput as DbUpdateImportInput,
} from "@builders/db"
import {
  buildImportWarehouseChangeBlockedMessage,
  isImportWarehouseChangeBlocked,
  validateImportPrimaryForm,
  type ImportPrimaryForm,
} from "@builders/domain"
import { assertActorEmail } from "../shared/assert-actor-email.js"
import { ImportExecutionError } from "./errors.js"
import type { ImportResult, UpdateImportInput } from "./types.js"

function emptyToNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length === 0 ? null : trimmed
}

function toPrimaryForm(input: UpdateImportInput, current: ImportPrimaryForm): ImportPrimaryForm {
  return {
    purchaseOrderNumber: input.purchaseOrderNumber ?? current.purchaseOrderNumber,
    internalNotes: input.internalNotes ?? current.internalNotes,
    warehouseId: input.warehouseId ?? current.warehouseId,
    entityId: input.entityId ?? current.entityId,
    color: input.color ?? current.color,
  }
}

export async function updateImportUseCase(
  id: string,
  input: UpdateImportInput,
  actorEmail: string,
  client?: Prisma.TransactionClient,
): Promise<ImportResult> {
  assertActorEmail(actorEmail, "updateImportUseCase")

  await withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    await lockImportRow(c, id)

    // Lean, relation-free merge read on the tx connection (existence + the
    // scalar fields the merge needs). A multi-relation read here would trip
    // Prisma's concurrent relation sub-queries on the single pinned connection;
    // the full record is enriched on the pool after commit (below).
    const current = await getImportPrimaryStateById(id, c)
    if (!current) {
      throw new ImportExecutionError({
        code: "IMPORT_NOT_FOUND",
        message: "Import not found.",
        status: 404,
      })
    }

    const merged = toPrimaryForm(input, current)

    const issues = validateImportPrimaryForm(merged)
    if (issues.length > 0) {
      const [first] = issues
      throw new ImportExecutionError({
        code: "IMPORT_VALIDATION_FAILED",
        message: first.message,
        status: 400,
        field: first.field,
        payload: { issues },
      })
    }

    if (input.warehouseId !== undefined && input.warehouseId !== current.warehouseId) {
      const warehouse = await getWarehouseById(merged.warehouseId, c)
      if (!warehouse) {
        throw new ImportExecutionError({
          code: "IMPORT_WAREHOUSE_NOT_FOUND",
          message: "Selected warehouse does not exist.",
          status: 404,
          field: "warehouseId",
        })
      }

      const linkState = await getImportLinkState(id, c)
      if (linkState && isImportWarehouseChangeBlocked(linkState)) {
        throw new ImportExecutionError({
          code: "IMPORT_WAREHOUSE_CHANGE_BLOCKED_BY_INVENTORY",
          message: buildImportWarehouseChangeBlockedMessage(linkState),
          status: 409,
          field: "warehouseId",
          payload: {
            stagedInventoryRowCount: linkState.stagedInventoryRowCount,
            liveInventoryRowCount: linkState.liveInventoryRowCount,
          },
        })
      }
    }

    const dbInput: DbUpdateImportInput = { updatedBy: actorEmail }
    if (input.purchaseOrderNumber !== undefined) dbInput.purchaseOrderNumber = emptyToNull(input.purchaseOrderNumber)
    if (input.internalNotes !== undefined) dbInput.internalNotes = emptyToNull(input.internalNotes)
    if (input.warehouseId !== undefined) {
      dbInput.warehouseId = input.warehouseId
    }
    if (input.entityId !== undefined) {
      const nextEntityId = emptyToNull(input.entityId)
      if (nextEntityId && !(await entityExists(nextEntityId, c))) {
        throw new ImportExecutionError({
          code: "IMPORT_ENTITY_NOT_FOUND",
          message: "Selected entity was not found.",
          status: 400,
          field: "entityId",
        })
      }
      dbInput.entityId = nextEntityId
    }
    // Palette tag rides through unread — metadata-only, no recompute.
    if (input.color !== undefined) dbInput.color = input.color

    // Lean write returns only { id }; the full record is enriched on the pool
    // after the transaction commits (below).
    await updateImportRecord(id, dbInput, c)
  })

  // Enrich the full record on the pool after commit — a multi-relation read must
  // not run on the pinned interactive-transaction connection.
  const record = await getImportById(id)
  if (!record) {
    throw new ImportExecutionError({
      code: "IMPORT_NOT_FOUND",
      message: "Import not found.",
      status: 404,
    })
  }
  return record
}
