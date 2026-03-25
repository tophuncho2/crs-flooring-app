import { Prisma } from "@builders/db"
import { withTransaction } from "@/features/flooring/shared/application/with-transaction"
import {
  createCutLogRecord,
  deleteCutLogRecord,
  getCutLogRebalanceState,
  getCutLogTarget,
  getInventoryCutBalanceState,
  listCutLogRecords,
  updateCutLogBalanceRows,
} from "@/features/flooring/inventory/data/cut-logs"
import { createAppError, parseDecimal, parseOptionalString, parseRequiredString } from "@/server/http/api-helpers"
import { buildFlooringProductDisplayName } from "@/features/flooring/shared/domain/product-display-name"
import { canCreateInventoryCutLogs, getInventoryCutLogBlockedReason } from "@/features/flooring/inventory/domain/filters"

function normalizeCutLog(log: {
  id: string
  inventoryId: string
  before: { toString(): string }
  cut: { toString(): string }
  after: { toString(): string }
  notes: string | null
  createdAt: Date
  inventory: {
    id: string
    itemNumber: string
    product: {
      name: string
      style: string | null
      color: string | null
    }
  }
}) {
  return {
    id: log.id,
    inventoryId: log.inventoryId,
    inventoryLabel: buildFlooringProductDisplayName(log.inventory.product),
    itemNumber: log.inventory.itemNumber,
    before: log.before.toString(),
    cut: log.cut.toString(),
    after: log.after.toString(),
    notes: log.notes ?? "",
    createdAt: log.createdAt.toISOString(),
  }
}

export async function listCutLogsUseCase(inventoryId: string | null) {
  const logs = await listCutLogRecords(inventoryId)

  return logs.map(normalizeCutLog)
}

export async function createCutLogUseCase(body: Record<string, unknown>) {
  const inventoryId = parseRequiredString(body.inventoryId, "inventoryId")
  const cut = parseDecimal(body.cut ?? body.quantityTaken, "cut", 2)

  const inventory = await getInventoryCutBalanceState(inventoryId)

  if (!inventory) {
    throw createAppError("Inventory row not found", { status: 404 })
  }

  if (!canCreateInventoryCutLogs({
    importEntryId: inventory.importEntryId,
    importStatus: inventory.importEntry?.status ?? "FINAL",
  })) {
    throw createAppError(getInventoryCutLogBlockedReason({
      importEntryId: inventory.importEntryId,
      importStatus: inventory.importEntry?.status ?? "FINAL",
    }), { status: 409 })
  }

  const cutTotal = inventory.cutLogs.reduce((sum, log) => sum.plus(log.cut), new Prisma.Decimal(0))
  const runningBalance = inventory.stockCount.minus(cutTotal)

  if (cut.gt(0) && runningBalance.lte(0)) {
    throw createAppError("This inventory row has no running balance left", { status: 400 })
  }

  if (cut.gt(runningBalance)) {
    throw createAppError("Quantity taken cannot exceed the current running balance", { status: 400 })
  }

  const created = await createCutLogRecord({
    inventoryId,
    before: runningBalance,
    cut,
    after: runningBalance.minus(cut),
    notes: parseOptionalString(body.notes),
  })

  return normalizeCutLog(created)
}

export async function deleteCutLogUseCase(id: string) {
  return withTransaction(async (tx) => {
    const target = await getCutLogTarget(id, tx)

    if (!target) {
      throw createAppError("Cut log not found", { status: 404 })
    }

    const inventory = await getCutLogRebalanceState(target.inventoryId, target.id, tx)

    if (!inventory) {
      throw createAppError("Inventory row not found", { status: 404 })
    }

    const updates: Array<{ id: string; before: Prisma.Decimal; after: Prisma.Decimal }> = []
    const updatedRows: Array<{ id: string; before: string; after: string }> = []
    let runningBalance = new Prisma.Decimal(inventory.stockCount)

    for (const cutLog of inventory.cutLogs) {
      const before = runningBalance
      const after = before.minus(cutLog.cut)
      updates.push({ id: cutLog.id, before, after })
      updatedRows.push({ id: cutLog.id, before: before.toString(), after: after.toString() })
      runningBalance = after
    }

    await deleteCutLogRecord(target.id, tx)
    await updateCutLogBalanceRows(updates, tx)

    return {
      success: true,
      inventoryId: target.inventoryId,
      updatedRows,
    }
  })
}
