import { Prisma } from "@prisma/client"
import { prisma } from "@/server/db/prisma"
import { createAppError, parseDecimal, parseOptionalString, parseRequiredString } from "@/server/http/api-helpers"
import { buildFlooringProductDisplayName } from "@/features/flooring/shared/domain/product-display-name"

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
  const logs = await prisma.flooringCutLog.findMany({
    where: inventoryId ? { inventoryId } : undefined,
    include: {
      inventory: {
        select: {
          id: true,
          itemNumber: true,
          product: {
            select: {
              name: true,
              style: true,
              color: true,
            },
          },
        },
      },
    },
    orderBy: [{ createdAt: "desc" }],
    take: 250,
  })

  return logs.map(normalizeCutLog)
}

export async function createCutLogUseCase(body: Record<string, unknown>) {
  const inventoryId = parseRequiredString(body.inventoryId, "inventoryId")
  const cut = parseDecimal(body.cut ?? body.quantityTaken, "cut", 2)

  const inventory = await prisma.flooringInventory.findUnique({
    where: { id: inventoryId },
    select: {
      stockCount: true,
      cutLogs: {
        select: {
          cut: true,
        },
      },
    },
  })

  if (!inventory) {
    throw createAppError("Inventory row not found", { status: 404 })
  }

  const cutTotal = inventory.cutLogs.reduce((sum, log) => sum.plus(log.cut), new Prisma.Decimal(0))
  const runningBalance = inventory.stockCount.minus(cutTotal)

  if (cut.gt(0) && runningBalance.lte(0)) {
    throw createAppError("This inventory row has no running balance left", { status: 400 })
  }

  if (cut.gt(runningBalance)) {
    throw createAppError("Quantity taken cannot exceed the current running balance", { status: 400 })
  }

  const created = await prisma.flooringCutLog.create({
    data: {
      inventoryId,
      before: runningBalance,
      cut,
      after: runningBalance.minus(cut),
      notes: parseOptionalString(body.notes),
    },
    include: {
      inventory: {
        select: {
          id: true,
          itemNumber: true,
          product: {
            select: {
              name: true,
              style: true,
              color: true,
            },
          },
        },
      },
    },
  })

  return normalizeCutLog(created)
}

export async function deleteCutLogUseCase(id: string) {
  const target = await prisma.flooringCutLog.findUnique({
    where: { id },
    select: { id: true, inventoryId: true },
  })

  if (!target) {
    throw createAppError("Cut log not found", { status: 404 })
  }

  const inventory = await prisma.flooringInventory.findUnique({
    where: { id: target.inventoryId },
    select: {
      id: true,
      stockCount: true,
      cutLogs: {
        where: { id: { not: target.id } },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          cut: true,
        },
      },
    },
  })

  if (!inventory) {
    throw createAppError("Inventory row not found", { status: 404 })
  }

  const updates: Array<ReturnType<typeof prisma.flooringCutLog.update>> = []
  const updatedRows: Array<{ id: string; before: string; after: string }> = []
  let runningBalance = new Prisma.Decimal(inventory.stockCount)

  for (const cutLog of inventory.cutLogs) {
    const before = runningBalance
    const after = before.minus(cutLog.cut)
    updates.push(
      prisma.flooringCutLog.update({
        where: { id: cutLog.id },
        data: { before, after },
      }),
    )
    updatedRows.push({ id: cutLog.id, before: before.toString(), after: after.toString() })
    runningBalance = after
  }

  await prisma.$transaction([
    prisma.flooringCutLog.delete({
      where: { id: target.id },
    }),
    ...updates,
  ])

  return {
    success: true,
    inventoryId: target.inventoryId,
    updatedRows,
  }
}
