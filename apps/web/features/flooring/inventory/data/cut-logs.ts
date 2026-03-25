import { Prisma, prisma, type DataAccessContext } from "@builders/db"

export async function listCutLogRecords(inventoryId: string | null, db: DataAccessContext = prisma) {
  return db.flooringCutLog.findMany({
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
}

export async function getInventoryCutBalanceState(inventoryId: string, db: DataAccessContext = prisma) {
  return db.flooringInventory.findUnique({
    where: { id: inventoryId },
    select: {
      id: true,
      importEntryId: true,
      importEntry: {
        select: {
          status: true,
        },
      },
      stockCount: true,
      cutLogs: {
        select: {
          cut: true,
        },
      },
    },
  })
}

export async function createCutLogRecord(
  input: {
    inventoryId: string
    before: Prisma.Decimal
    cut: Prisma.Decimal
    after: Prisma.Decimal
    notes: string | null
  },
  db: DataAccessContext = prisma,
) {
  return db.flooringCutLog.create({
    data: {
      inventoryId: input.inventoryId,
      before: input.before,
      cut: input.cut,
      after: input.after,
      notes: input.notes,
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
}

export async function getCutLogTarget(id: string, db: DataAccessContext = prisma) {
  return db.flooringCutLog.findUnique({
    where: { id },
    select: { id: true, inventoryId: true },
  })
}

export async function getCutLogRebalanceState(
  inventoryId: string,
  excludingCutLogId: string,
  db: DataAccessContext = prisma,
) {
  return db.flooringInventory.findUnique({
    where: { id: inventoryId },
    select: {
      id: true,
      stockCount: true,
      cutLogs: {
        where: { id: { not: excludingCutLogId } },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          cut: true,
        },
      },
    },
  })
}

export async function deleteCutLogRecord(id: string, db: DataAccessContext = prisma) {
  await db.flooringCutLog.delete({
    where: { id },
  })
}

export async function updateCutLogBalanceRows(
  updates: Array<{ id: string; before: Prisma.Decimal; after: Prisma.Decimal }>,
  db: DataAccessContext = prisma,
) {
  await Promise.all(
    updates.map((cutLog) =>
      db.flooringCutLog.update({
        where: { id: cutLog.id },
        data: {
          before: cutLog.before,
          after: cutLog.after,
        },
      }),
    ),
  )
}
