import { db } from "../../../client.js"
import type { Prisma, PrismaClient } from "../../../generated/prisma/client.js"
import {
  type WorkOrderMaterialItemCreateForm,
  type WorkOrderMaterialItemRow,
} from "@builders/domain"
import { listWorkOrderMaterialItems } from "./read-repository.js"

type WorkOrdersDbClient = PrismaClient | Prisma.TransactionClient

/**
 * Wire-input shape for material-item creates (UoM epic 2C). The create form
 * carries the editable `unitId` FK directly — a user-managed, per-row value the
 * client fills on product select; the server persists only the form's own value
 * (no product-unit fallback). The frozen `sendUnit*` snapshot is no longer
 * written; the item's `unitId` FK is authoritative.
 */
export type WriteWorkOrderMaterialItemCreateInput = WorkOrderMaterialItemCreateForm

/**
 * Wire-input shape for material-item updates. Always carries the mutable
 * quantity/notes + the editable `unitId` (the user's own edit — "" disconnects).
 * `product` is present only when the product changed (always allowed now that
 * adjustments don't link to a material item) and just reconnects the product FK.
 */
export type WriteWorkOrderMaterialItemUpdateInput = {
  quantity: string
  notes: string
  unitId: string
  product?: { productId: string }
}

// Quantity is optional: a blank string means "unset" and is stored as
// NULL. A non-blank string is handed straight to Prisma, which coerces it
// to Decimal.
function toDecimal(value: string): Prisma.Decimal | string | null {
  return value.trim() ? value : null
}

// "" / whitespace disconnects the unit (stored NULL); otherwise the FK id.
function toUnitId(value: string): string | null {
  return value.trim() ? value : null
}

export type ApplyWorkOrderMaterialItemsDiffInput = {
  workOrderId: string
  // Actor email stamped on every written item: createdBy + updatedBy on added
  // rows, updatedBy on modified rows. Deletes never stamp.
  actorEmail: string
  added: Array<{ id: string; tempId: string; input: WriteWorkOrderMaterialItemCreateInput }>
  modified: Array<{ id: string; input: WriteWorkOrderMaterialItemUpdateInput }>
  deleted: Array<{ id: string }>
}

export type ApplyWorkOrderMaterialItemsDiffResult = {
  items: WorkOrderMaterialItemRow[]
  tempIdMap: Record<string, string>
}

/**
 * Section-save diff applier. Mirrors templates' `applyTemplateMaterialItemsDiff`.
 * Adjustments no longer link to a material item, so deleting a WOMI is a plain
 * row delete with no adjustment cleanup.
 */
export async function applyWorkOrderMaterialItemsDiff(
  tx: Prisma.TransactionClient,
  input: ApplyWorkOrderMaterialItemsDiffInput,
): Promise<ApplyWorkOrderMaterialItemsDiffResult> {
  if (input.deleted.length > 0) {
    const deletedIds = input.deleted.map((d) => d.id)
    await tx.flooringWorkOrderItem.deleteMany({
      where: { id: { in: deletedIds } },
    })
  }

  const tempIdMap: Record<string, string> = {}
  for (const draft of input.added) {
    tempIdMap[draft.tempId] = draft.id
  }

  if (input.added.length > 0) {
    await tx.flooringWorkOrderItem.createMany({
      data: input.added.map((draft) => ({
        id: draft.id,
        workOrderId: input.workOrderId,
        productId: draft.input.productId,
        quantity: toDecimal(draft.input.quantity),
        unitId: toUnitId(draft.input.unitId),
        notes: draft.input.notes ? draft.input.notes : null,
        createdBy: input.actorEmail,
        updatedBy: input.actorEmail,
      })),
    })
  }

  for (const update of input.modified) {
    await tx.flooringWorkOrderItem.update({
      where: { id: update.id },
      data: {
        quantity: toDecimal(update.input.quantity),
        // Scalar FK writes (not nested `connect`) so `unitId` + `productId` stay
        // in the same Prisma unchecked-update variant.
        unitId: toUnitId(update.input.unitId),
        notes: update.input.notes ? update.input.notes : null,
        updatedBy: input.actorEmail,
        ...(update.input.product ? { productId: update.input.product.productId } : {}),
      },
    })
  }

  const items = await listWorkOrderMaterialItems(input.workOrderId, tx)
  return { items, tempIdMap }
}

