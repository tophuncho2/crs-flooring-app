import { Prisma } from "@prisma/client"
import { db } from "../../client.js"

type WorkOrderAllocationDbClient = Prisma.TransactionClient | typeof db

export type WorkOrderItemAllocationMethodRecord = "MANUAL" | "AUTO"
export type WorkOrderAllocationRunStatusRecord =
  | "REQUESTED"
  | "QUEUED"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "SUPERSEDED"

export type WorkOrderItemAllocationRecord = {
  id: string
  workOrderItemId: string
  inventoryId: string
  quantity: string
  cutSize: string
  unitCost: string
  totalCost: number
  method: WorkOrderItemAllocationMethodRecord
  notes: string
  createdAt: string
  updatedAt: string
  inventory: {
    itemNumber: string
    dyeLot: string
    locationCode: string
    warehouseName: string
    stockUnit: string
  }
}

export type InventoryAllocationOptionRecord = {
  id: string
  productId: string
  warehouseId: string
  warehouseName: string
  fifoReceivedAt: string
  itemNumber: string
  dyeLot: string
  locationCode: string
  stockUnit: string
  stockCount: string
  cutTotal: number
  reservedStockCount: string
  availableToAllocate: number
  pricePerUnit: number
  label: string
}

export type WorkOrderItemAllocationDetailRecord = {
  itemId: string
  allocations: WorkOrderItemAllocationRecord[]
  allocatedQuantity: number
  remainingQuantity: number
  materialExpense: number
  hasAllocationShortage: boolean
}

export type WorkOrderAllocationRunRecord = {
  id: string
  workOrderId: string
  requestedByUserId: string
  sourceVersion: string
  idempotencyKey: string
  status: WorkOrderAllocationRunStatusRecord
  requestId: string | null
  queueJobId: string | null
  requestedAt: string
  queuedAt: string | null
  startedAt: string | null
  completedAt: string | null
  failedAt: string | null
  failureCode: string | null
  failureMessage: string | null
  allocatedRowCount: number
  shortageCount: number
}

export type WorkOrderAutoAllocationSourceRecord = {
  allocationRun: WorkOrderAllocationRunRecord
  workOrder: {
    id: string
    warehouseId: string
    sourceVersion: string
  }
  items: Array<{
    id: string
    productId: string
    quantity: string
    manualAllocations: WorkOrderItemAllocationRecord[]
    autoAllocations: WorkOrderItemAllocationRecord[]
  }>
  inventoryCandidates: Array<InventoryAllocationOptionRecord>
}

type InventoryForAllocation = {
  id: string
  productId: string
  itemNumber: string
  dyeLot: string | null
  stockCount: Prisma.Decimal
  reservedStockCount: Prisma.Decimal
  cost: Prisma.Decimal | null
  freight: Prisma.Decimal | null
  fifoReceivedAt: Date
  createdAt: Date
  cutLogs: Array<{ cut: Prisma.Decimal }>
  location: {
    locationCode: string
    warehouse: {
      id: string
      name: string
    }
  } | null
  importEntry: {
    warehouse: {
      id: string
      name: string
    } | null
  } | null
  product: {
    category: {
      stockUnit: {
        name: string
      } | null
    }
  }
}

const allocationSelect = {
  id: true,
  workOrderItemId: true,
  inventoryId: true,
  quantity: true,
  cutSize: true,
  unitCost: true,
  method: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  inventory: {
    select: {
      itemNumber: true,
      dyeLot: true,
      product: {
        select: {
          category: {
            select: {
              stockUnit: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
      location: {
        select: {
          locationCode: true,
          warehouse: {
            select: {
              name: true,
            },
          },
        },
      },
      importEntry: {
        select: {
          warehouse: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  },
} as const

const allocationRunSelect = {
  id: true,
  workOrderId: true,
  requestedByUserId: true,
  sourceVersion: true,
  idempotencyKey: true,
  status: true,
  requestId: true,
  queueJobId: true,
  requestedAt: true,
  queuedAt: true,
  startedAt: true,
  completedAt: true,
  failedAt: true,
  failureCode: true,
  failureMessage: true,
  allocatedRowCount: true,
  shortageCount: true,
} as const

const fifoInventoryOrderBy = [
  { fifoReceivedAt: "asc" as const },
  { itemNumber: "asc" as const },
  { id: "asc" as const },
]

function withAllocationTransaction<T>(
  client: WorkOrderAllocationDbClient,
  callback: (tx: Prisma.TransactionClient) => Promise<T>,
) {
  if ("$transaction" in client && typeof client.$transaction === "function") {
    return client.$transaction(callback)
  }

  return callback(client)
}

function toNumber(value: Prisma.Decimal | number | string | null | undefined) {
  if (value === null || value === undefined) {
    return 0
  }

  const parsed = typeof value === "number" ? value : Number(value.toString())
  return Number.isFinite(parsed) ? parsed : 0
}

function toDecimalString(value: Prisma.Decimal | number | string | null | undefined) {
  if (value === null || value === undefined) {
    return "0"
  }

  return typeof value === "string" ? value : value.toString()
}

function calculateInventoryPricePerUnit(input: {
  stockCount: Prisma.Decimal | number | string | null | undefined
  cost: Prisma.Decimal | number | string | null | undefined
  freight: Prisma.Decimal | number | string | null | undefined
}) {
  const stockCount = toNumber(input.stockCount)
  if (stockCount <= 0) {
    return 0
  }

  return (toNumber(input.cost) + toNumber(input.freight)) / stockCount
}

function calculateAllocationRowTotal(input: {
  quantity: Prisma.Decimal | number | string | null | undefined
  unitCost: Prisma.Decimal | number | string | null | undefined
}) {
  return toNumber(input.quantity) * toNumber(input.unitCost)
}

function buildWorkOrderItemAllocationSummary(input: {
  requiredQuantity: Prisma.Decimal | number | string | null | undefined
  allocations: Array<{
    quantity: Prisma.Decimal | number | string | null | undefined
    unitCost: Prisma.Decimal | number | string | null | undefined
  }>
}) {
  const allocatedQuantity = input.allocations.reduce(
    (total, allocation) => total + toNumber(allocation.quantity),
    0,
  )
  const requiredQuantity = toNumber(input.requiredQuantity)
  const remainingQuantity = Math.max(0, requiredQuantity - allocatedQuantity)
  const materialExpense = input.allocations.reduce(
    (total, allocation) => total + calculateAllocationRowTotal(allocation),
    0,
  )

  return {
    allocatedQuantity,
    remainingQuantity,
    materialExpense,
    hasAllocationShortage: remainingQuantity > 0,
  }
}

function sumCutTotal(cutLogs: Array<{ cut: Prisma.Decimal }>) {
  return cutLogs.reduce((total, entry) => total + toNumber(entry.cut), 0)
}

function deriveInventoryWarehouse(inventory: InventoryForAllocation) {
  const locationWarehouse = inventory.location?.warehouse
  if (locationWarehouse) {
    return locationWarehouse
  }

  return inventory.importEntry?.warehouse ?? null
}

function deriveInventoryStockUnit(inventory: InventoryForAllocation) {
  return inventory.product.category.stockUnit?.name ?? ""
}

function buildInventoryAllocationLabel(input: {
  stockCount: string
  stockUnit: string
  itemNumber: string
  locationCode: string
  dyeLot: string
}) {
  const stockSummary = [input.stockCount, input.stockUnit].filter(Boolean).join(" ").trim()

  return [
    stockSummary,
    input.itemNumber ? `Item ${input.itemNumber}` : "",
    input.locationCode,
    input.dyeLot ? `Dye ${input.dyeLot}` : "",
  ]
    .filter(Boolean)
    .join(" - ")
}

function toInventoryAllocationOptionRecord(inventory: InventoryForAllocation): InventoryAllocationOptionRecord | null {
  const warehouse = deriveInventoryWarehouse(inventory)
  if (!warehouse) {
    return null
  }

  const cutTotal = sumCutTotal(inventory.cutLogs)
  const availableToAllocate = Math.max(
    0,
    toNumber(inventory.stockCount) - cutTotal - toNumber(inventory.reservedStockCount),
  )
  const pricePerUnit = calculateInventoryPricePerUnit({
    stockCount: inventory.stockCount.toString(),
    cost: inventory.cost?.toString() ?? null,
    freight: inventory.freight?.toString() ?? null,
  })
  const locationCode = inventory.location?.locationCode ?? ""
  const stockUnit = deriveInventoryStockUnit(inventory)

  return {
    id: inventory.id,
    productId: inventory.productId,
    warehouseId: warehouse.id,
    warehouseName: warehouse.name,
    fifoReceivedAt: inventory.fifoReceivedAt.toISOString(),
    itemNumber: inventory.itemNumber,
    dyeLot: inventory.dyeLot ?? "",
    locationCode,
    stockUnit,
    stockCount: inventory.stockCount.toString(),
    cutTotal,
    reservedStockCount: inventory.reservedStockCount.toString(),
    availableToAllocate,
    pricePerUnit,
    label: buildInventoryAllocationLabel({
      stockCount: inventory.stockCount.toString(),
      stockUnit,
      itemNumber: inventory.itemNumber,
      locationCode,
      dyeLot: inventory.dyeLot ?? "",
    }),
  }
}

function toWorkOrderItemAllocationRecord(allocation: {
  id: string
  workOrderItemId: string
  inventoryId: string
  quantity: Prisma.Decimal
  cutSize: string | null
  unitCost: Prisma.Decimal
  method: WorkOrderItemAllocationMethodRecord
  notes: string | null
  createdAt: Date
  updatedAt: Date
  inventory: {
    itemNumber: string
    dyeLot: string | null
    product: {
      category: {
        stockUnit: {
          name: string
        } | null
      }
    }
    location: {
      locationCode: string
      warehouse: {
        name: string
      }
    } | null
    importEntry: {
      warehouse: {
        name: string
      } | null
    } | null
  }
}): WorkOrderItemAllocationRecord {
  return {
    id: allocation.id,
    workOrderItemId: allocation.workOrderItemId,
    inventoryId: allocation.inventoryId,
    quantity: allocation.quantity.toString(),
    cutSize: allocation.cutSize ?? "",
    unitCost: allocation.unitCost.toString(),
    totalCost: calculateAllocationRowTotal({
      quantity: allocation.quantity.toString(),
      unitCost: allocation.unitCost.toString(),
    }),
    method: allocation.method,
    notes: allocation.notes ?? "",
    createdAt: allocation.createdAt.toISOString(),
    updatedAt: allocation.updatedAt.toISOString(),
    inventory: {
      itemNumber: allocation.inventory.itemNumber,
      dyeLot: allocation.inventory.dyeLot ?? "",
      locationCode: allocation.inventory.location?.locationCode ?? "Unassigned",
      warehouseName:
        allocation.inventory.location?.warehouse.name ??
        allocation.inventory.importEntry?.warehouse?.name ??
        "",
      stockUnit: allocation.inventory.product.category.stockUnit?.name ?? "",
    },
  }
}

function toWorkOrderAllocationRunRecord(run: {
  id: string
  workOrderId: string
  requestedByUserId: string
  sourceVersion: Date
  idempotencyKey: string
  status: WorkOrderAllocationRunStatusRecord
  requestId: string | null
  queueJobId: string | null
  requestedAt: Date
  queuedAt: Date | null
  startedAt: Date | null
  completedAt: Date | null
  failedAt: Date | null
  failureCode: string | null
  failureMessage: string | null
  allocatedRowCount: number
  shortageCount: number
}): WorkOrderAllocationRunRecord {
  return {
    id: run.id,
    workOrderId: run.workOrderId,
    requestedByUserId: run.requestedByUserId,
    sourceVersion: run.sourceVersion.toISOString(),
    idempotencyKey: run.idempotencyKey,
    status: run.status,
    requestId: run.requestId,
    queueJobId: run.queueJobId,
    requestedAt: run.requestedAt.toISOString(),
    queuedAt: run.queuedAt?.toISOString() ?? null,
    startedAt: run.startedAt?.toISOString() ?? null,
    completedAt: run.completedAt?.toISOString() ?? null,
    failedAt: run.failedAt?.toISOString() ?? null,
    failureCode: run.failureCode,
    failureMessage: run.failureMessage,
    allocatedRowCount: run.allocatedRowCount,
    shortageCount: run.shortageCount,
  }
}

async function lockInventoryRows(client: WorkOrderAllocationDbClient, inventoryIds: string[]) {
  const uniqueInventoryIds = Array.from(new Set(inventoryIds.filter(Boolean)))
  if (uniqueInventoryIds.length === 0) {
    return
  }

  await client.$queryRaw(
    Prisma.sql`SELECT "id" FROM "flooring_inventory" WHERE "id" IN (${Prisma.join(uniqueInventoryIds)}) FOR UPDATE`,
  )
}

export async function lockWorkOrderAllocationScope(
  client: WorkOrderAllocationDbClient,
  workOrderId: string,
) {
  await client.$queryRaw(
    Prisma.sql`SELECT "id" FROM "flooring_work_order" WHERE "id" = ${workOrderId} FOR UPDATE`,
  )
}

async function getWorkOrderItemWithContext(
  client: WorkOrderAllocationDbClient,
  workOrderId: string,
  itemId: string,
) {
  return client.flooringWorkOrderItem.findFirstOrThrow({
    where: {
      id: itemId,
      workOrderId,
    },
    select: {
      id: true,
      productId: true,
      quantity: true,
      workOrder: {
        select: {
          id: true,
          warehouseId: true,
          updatedAt: true,
        },
      },
    },
  })
}

async function getInventoryForAllocation(
  client: WorkOrderAllocationDbClient,
  inventoryId: string,
) {
  return client.flooringInventory.findUniqueOrThrow({
    where: { id: inventoryId },
    select: {
      id: true,
      productId: true,
      itemNumber: true,
      dyeLot: true,
      stockCount: true,
      reservedStockCount: true,
      cost: true,
      freight: true,
      fifoReceivedAt: true,
      createdAt: true,
      cutLogs: {
        select: {
          cut: true,
        },
      },
      location: {
        select: {
          locationCode: true,
          warehouse: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      importEntry: {
        select: {
          warehouse: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      product: {
        select: {
          category: {
            select: {
              stockUnit: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  })
}

async function getReservedQuantityForInventory(
  client: WorkOrderAllocationDbClient,
  inventoryId: string,
  excludeAllocationId?: string,
) {
  const result = await client.flooringWorkOrderItemAllocation.aggregate({
    where: {
      inventoryId,
      ...(excludeAllocationId ? { id: { not: excludeAllocationId } } : {}),
    },
    _sum: {
      quantity: true,
    },
  })

  return toNumber(result._sum.quantity)
}

async function getAllocatedQuantityForWorkOrderItem(
  client: WorkOrderAllocationDbClient,
  workOrderItemId: string,
  excludeAllocationId?: string,
) {
  const result = await client.flooringWorkOrderItemAllocation.aggregate({
    where: {
      workOrderItemId,
      ...(excludeAllocationId ? { id: { not: excludeAllocationId } } : {}),
    },
    _sum: {
      quantity: true,
    },
  })

  return toNumber(result._sum.quantity)
}

async function refreshInventoryReservedStockCount(
  client: WorkOrderAllocationDbClient,
  inventoryId: string,
) {
  const result = await client.flooringWorkOrderItemAllocation.aggregate({
    where: { inventoryId },
    _sum: {
      quantity: true,
    },
  })

  await client.flooringInventory.update({
    where: { id: inventoryId },
    data: {
      reservedStockCount: result._sum.quantity ?? new Prisma.Decimal(0),
    },
  })
}

export async function recalculateWorkOrderItemAllocationStatus(
  client: WorkOrderAllocationDbClient,
  workOrderItemId: string,
) {
  const item = await client.flooringWorkOrderItem.findUniqueOrThrow({
    where: { id: workOrderItemId },
    select: {
      id: true,
      quantity: true,
      allocations: {
        select: {
          quantity: true,
          unitCost: true,
        },
      },
    },
  })

  const summary = buildWorkOrderItemAllocationSummary({
    requiredQuantity: item.quantity.toString(),
    allocations: item.allocations.map((allocation) => ({
      quantity: allocation.quantity.toString(),
      unitCost: allocation.unitCost.toString(),
    })),
  })

  await client.flooringWorkOrderItem.update({
    where: { id: workOrderItemId },
    data: {
      changeOrderStatus: summary.hasAllocationShortage ? "SHORTAGE" : "SUFFICIENT",
    },
  })

  return summary
}

function assertInventoryCompatible(input: {
  itemProductId: string
  workOrderWarehouseId: string | null
  inventoryProductId: string
  inventoryWarehouseId: string | null
}) {
  if (!input.workOrderWarehouseId) {
    throw new Error("Work order must have a warehouse before allocations can be created")
  }

  if (input.itemProductId !== input.inventoryProductId) {
    throw new Error("Inventory row must match the material item product")
  }

  if (!input.inventoryWarehouseId || input.inventoryWarehouseId !== input.workOrderWarehouseId) {
    throw new Error("Inventory row must belong to the work order warehouse")
  }
}

async function validateAllocationQuantityForInventory(input: {
  client: WorkOrderAllocationDbClient
  inventory: InventoryForAllocation
  quantity: Prisma.Decimal
  excludeAllocationId?: string
}) {
  const reservedQuantity = await getReservedQuantityForInventory(
    input.client,
    input.inventory.id,
    input.excludeAllocationId,
  )
  const cutTotal = sumCutTotal(input.inventory.cutLogs)
  const availableToAllocate =
    toNumber(input.inventory.stockCount) - cutTotal - reservedQuantity

  if (toNumber(input.quantity) > availableToAllocate) {
    throw new Error("Allocation quantity exceeds the remaining available inventory")
  }
}

async function validateAllocationQuantityForWorkOrderItem(input: {
  client: WorkOrderAllocationDbClient
  workOrderItemId: string
  requiredQuantity: Prisma.Decimal
  allocationQuantity: Prisma.Decimal
  excludeAllocationId?: string
}) {
  const allocatedQuantity = await getAllocatedQuantityForWorkOrderItem(
    input.client,
    input.workOrderItemId,
    input.excludeAllocationId,
  )
  const nextAllocatedQuantity = allocatedQuantity + toNumber(input.allocationQuantity)

  if (nextAllocatedQuantity - toNumber(input.requiredQuantity) > 0.0001) {
    throw new Error("Allocation quantity exceeds the material item quantity")
  }
}

async function loadAllocationRecord(
  client: WorkOrderAllocationDbClient,
  allocationId: string,
) {
  const allocation = await client.flooringWorkOrderItemAllocation.findUniqueOrThrow({
    where: { id: allocationId },
    select: allocationSelect,
  })

  return toWorkOrderItemAllocationRecord(allocation)
}

export async function listWorkOrderItemAllocations(
  workOrderId: string,
  workOrderItemId: string,
  client: WorkOrderAllocationDbClient = db,
) {
  await getWorkOrderItemWithContext(client, workOrderId, workOrderItemId)

  const allocations = await client.flooringWorkOrderItemAllocation.findMany({
    where: {
      workOrderItemId,
    },
    orderBy: [
      { createdAt: "asc" },
      { id: "asc" },
    ],
    select: allocationSelect,
  })

  return allocations.map(toWorkOrderItemAllocationRecord)
}

export async function listWorkOrderAllocationDetails(
  workOrderId: string,
  client: WorkOrderAllocationDbClient = db,
) {
  const items = await client.flooringWorkOrderItem.findMany({
    where: { workOrderId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      quantity: true,
      allocations: {
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: allocationSelect,
      },
    },
  })

  return items.map<WorkOrderItemAllocationDetailRecord>((item) => {
    const allocations = item.allocations.map(toWorkOrderItemAllocationRecord)
    const summary = buildWorkOrderItemAllocationSummary({
      requiredQuantity: item.quantity.toString(),
      allocations: allocations.map((allocation) => ({
        quantity: allocation.quantity,
        unitCost: allocation.unitCost,
      })),
    })

    return {
      itemId: item.id,
      allocations,
      allocatedQuantity: summary.allocatedQuantity,
      remainingQuantity: summary.remainingQuantity,
      materialExpense: summary.materialExpense,
      hasAllocationShortage: summary.hasAllocationShortage,
    }
  })
}

export async function listInventoryAllocationOptionsForWorkOrderItem(
  workOrderId: string,
  workOrderItemId: string,
  client: WorkOrderAllocationDbClient = db,
) {
  const item = await getWorkOrderItemWithContext(client, workOrderId, workOrderItemId)
  if (!item.workOrder.warehouseId) {
    return []
  }

  const inventories = await client.flooringInventory.findMany({
    where: {
      productId: item.productId,
      OR: [
        {
          location: {
            warehouseId: item.workOrder.warehouseId,
          },
        },
        {
          importEntry: {
            warehouseId: item.workOrder.warehouseId,
          },
        },
      ],
    },
    orderBy: fifoInventoryOrderBy,
    select: {
      id: true,
      productId: true,
      itemNumber: true,
      dyeLot: true,
      stockCount: true,
      reservedStockCount: true,
      cost: true,
      freight: true,
      fifoReceivedAt: true,
      createdAt: true,
      cutLogs: {
        select: {
          cut: true,
        },
      },
      location: {
        select: {
          locationCode: true,
          warehouse: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      importEntry: {
        select: {
          warehouse: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      product: {
        select: {
          category: {
            select: {
              stockUnit: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  })

  return inventories
    .map((inventory) => toInventoryAllocationOptionRecord(inventory))
    .filter((inventory): inventory is InventoryAllocationOptionRecord => Boolean(inventory))
    .filter((inventory) => inventory.availableToAllocate > 0)
}

export async function createWorkOrderItemAllocation(
  input: {
    workOrderId: string
    workOrderItemId: string
    inventoryId: string
    quantity: Prisma.Decimal
    cutSize?: string | null
    notes?: string | null
    method?: WorkOrderItemAllocationMethodRecord
  },
  client: WorkOrderAllocationDbClient = db,
) {
  return withAllocationTransaction(client, async (tx) => {
    const item = await getWorkOrderItemWithContext(tx, input.workOrderId, input.workOrderItemId)
    await lockInventoryRows(tx, [input.inventoryId])

    const inventory = await getInventoryForAllocation(tx, input.inventoryId)
    const inventoryOption = toInventoryAllocationOptionRecord(inventory)

    assertInventoryCompatible({
      itemProductId: item.productId,
      workOrderWarehouseId: item.workOrder.warehouseId,
      inventoryProductId: inventory.productId,
      inventoryWarehouseId: inventoryOption?.warehouseId ?? null,
    })

    await validateAllocationQuantityForInventory({
      client: tx,
      inventory,
      quantity: input.quantity,
    })
    await validateAllocationQuantityForWorkOrderItem({
      client: tx,
      workOrderItemId: item.id,
      requiredQuantity: item.quantity,
      allocationQuantity: input.quantity,
    })

    const allocation = await tx.flooringWorkOrderItemAllocation.create({
      data: {
        workOrderItemId: item.id,
        inventoryId: inventory.id,
        quantity: input.quantity,
        cutSize: input.cutSize ?? null,
        unitCost: calculateInventoryPricePerUnit({
          stockCount: inventory.stockCount.toString(),
          cost: inventory.cost?.toString() ?? null,
          freight: inventory.freight?.toString() ?? null,
        }),
        method: input.method ?? "MANUAL",
        notes: input.notes ?? null,
      },
      select: allocationSelect,
    })

    await refreshInventoryReservedStockCount(tx, inventory.id)
    await recalculateWorkOrderItemAllocationStatus(tx, item.id)

    return toWorkOrderItemAllocationRecord(allocation)
  })
}

export async function updateWorkOrderItemAllocation(
  input: {
    workOrderId: string
    workOrderItemId: string
    allocationId: string
    inventoryId?: string
    quantity?: Prisma.Decimal
    cutSize?: string | null
    notes?: string | null
  },
  client: WorkOrderAllocationDbClient = db,
) {
  return withAllocationTransaction(client, async (tx) => {
    const item = await getWorkOrderItemWithContext(tx, input.workOrderId, input.workOrderItemId)
    const existing = await tx.flooringWorkOrderItemAllocation.findUniqueOrThrow({
      where: { id: input.allocationId },
      select: {
        id: true,
        workOrderItemId: true,
        inventoryId: true,
        quantity: true,
      },
    })

    if (existing.workOrderItemId !== item.id) {
      throw new Error("Allocation does not belong to the selected material item")
    }

    const nextInventoryId = input.inventoryId ?? existing.inventoryId
    const nextQuantity = input.quantity ?? existing.quantity

    await lockInventoryRows(tx, [existing.inventoryId, nextInventoryId])

    const inventory = await getInventoryForAllocation(tx, nextInventoryId)
    const inventoryOption = toInventoryAllocationOptionRecord(inventory)

    assertInventoryCompatible({
      itemProductId: item.productId,
      workOrderWarehouseId: item.workOrder.warehouseId,
      inventoryProductId: inventory.productId,
      inventoryWarehouseId: inventoryOption?.warehouseId ?? null,
    })

    await validateAllocationQuantityForInventory({
      client: tx,
      inventory,
      quantity: nextQuantity,
      excludeAllocationId: existing.id,
    })
    await validateAllocationQuantityForWorkOrderItem({
      client: tx,
      workOrderItemId: item.id,
      requiredQuantity: item.quantity,
      allocationQuantity: nextQuantity,
      excludeAllocationId: existing.id,
    })

    await tx.flooringWorkOrderItemAllocation.update({
      where: { id: existing.id },
      data: {
        inventoryId: nextInventoryId,
        quantity: nextQuantity,
        cutSize: input.cutSize ?? undefined,
        notes: input.notes ?? undefined,
        unitCost: calculateInventoryPricePerUnit({
          stockCount: inventory.stockCount.toString(),
          cost: inventory.cost?.toString() ?? null,
          freight: inventory.freight?.toString() ?? null,
        }),
      },
    })

    await refreshInventoryReservedStockCount(tx, existing.inventoryId)
    if (nextInventoryId !== existing.inventoryId) {
      await refreshInventoryReservedStockCount(tx, nextInventoryId)
    }
    await recalculateWorkOrderItemAllocationStatus(tx, item.id)

    return loadAllocationRecord(tx, existing.id)
  })
}

export async function deleteWorkOrderItemAllocation(
  input: {
    workOrderId: string
    workOrderItemId: string
    allocationId: string
  },
  client: WorkOrderAllocationDbClient = db,
) {
  return withAllocationTransaction(client, async (tx) => {
    const item = await getWorkOrderItemWithContext(tx, input.workOrderId, input.workOrderItemId)
    const allocation = await tx.flooringWorkOrderItemAllocation.findUniqueOrThrow({
      where: { id: input.allocationId },
      select: {
        id: true,
        workOrderItemId: true,
        inventoryId: true,
      },
    })

    if (allocation.workOrderItemId !== item.id) {
      throw new Error("Allocation does not belong to the selected material item")
    }

    await lockInventoryRows(tx, [allocation.inventoryId])
    await tx.flooringWorkOrderItemAllocation.delete({
      where: { id: allocation.id },
    })

    await refreshInventoryReservedStockCount(tx, allocation.inventoryId)
    await recalculateWorkOrderItemAllocationStatus(tx, item.id)
  })
}

export async function deleteAllAllocationsForWorkOrderItem(
  workOrderItemId: string,
  client: WorkOrderAllocationDbClient = db,
) {
  return withAllocationTransaction(client, async (tx) => {
    const allocations = await tx.flooringWorkOrderItemAllocation.findMany({
      where: { workOrderItemId },
      select: {
        inventoryId: true,
      },
    })
    const inventoryIds = allocations.map((allocation) => allocation.inventoryId)

    await lockInventoryRows(tx, inventoryIds)
    await tx.flooringWorkOrderItemAllocation.deleteMany({
      where: { workOrderItemId },
    })

    for (const inventoryId of Array.from(new Set(inventoryIds))) {
      await refreshInventoryReservedStockCount(tx, inventoryId)
    }

    await recalculateWorkOrderItemAllocationStatus(tx, workOrderItemId)
  })
}

export async function deleteAllAutoAllocationsForWorkOrder(
  workOrderId: string,
  client: WorkOrderAllocationDbClient = db,
) {
  return withAllocationTransaction(client, async (tx) => {
    const allocations = await tx.flooringWorkOrderItemAllocation.findMany({
      where: {
        method: "AUTO",
        workOrderItem: {
          workOrderId,
        },
      },
      select: {
        id: true,
        inventoryId: true,
        workOrderItemId: true,
      },
    })

    const inventoryIds = Array.from(new Set(allocations.map((allocation) => allocation.inventoryId)))
    const workOrderItemIds = Array.from(new Set(allocations.map((allocation) => allocation.workOrderItemId)))

    await lockInventoryRows(tx, inventoryIds)
    await tx.flooringWorkOrderItemAllocation.deleteMany({
      where: {
        id: {
          in: allocations.map((allocation) => allocation.id),
        },
      },
    })

    for (const inventoryId of inventoryIds) {
      await refreshInventoryReservedStockCount(tx, inventoryId)
    }
    for (const itemId of workOrderItemIds) {
      await recalculateWorkOrderItemAllocationStatus(tx, itemId)
    }
  })
}

export async function clearAllocationsForWorkOrder(
  workOrderId: string,
  client: WorkOrderAllocationDbClient = db,
) {
  return withAllocationTransaction(client, async (tx) => {
    const allocations = await tx.flooringWorkOrderItemAllocation.findMany({
      where: {
        workOrderItem: {
          workOrderId,
        },
      },
      select: {
        id: true,
        inventoryId: true,
        workOrderItemId: true,
      },
    })

    const inventoryIds = Array.from(new Set(allocations.map((allocation) => allocation.inventoryId)))
    const workOrderItemIds = Array.from(new Set(allocations.map((allocation) => allocation.workOrderItemId)))

    await lockInventoryRows(tx, inventoryIds)
    await tx.flooringWorkOrderItemAllocation.deleteMany({
      where: {
        id: {
          in: allocations.map((allocation) => allocation.id),
        },
      },
    })

    for (const inventoryId of inventoryIds) {
      await refreshInventoryReservedStockCount(tx, inventoryId)
    }
    for (const itemId of workOrderItemIds) {
      await recalculateWorkOrderItemAllocationStatus(tx, itemId)
    }
  })
}

export async function listAutoAllocationInventoryCandidates(
  workOrderId: string,
  client: WorkOrderAllocationDbClient = db,
) {
  const workOrder = await client.flooringWorkOrder.findUniqueOrThrow({
    where: { id: workOrderId },
    select: {
      warehouseId: true,
      items: {
        select: {
          productId: true,
        },
      },
    },
  })

  if (!workOrder.warehouseId) {
    return []
  }

  const productIds = Array.from(new Set(workOrder.items.map((item) => item.productId)))
  if (productIds.length === 0) {
    return []
  }

  const inventories = await client.flooringInventory.findMany({
    where: {
      productId: {
        in: productIds,
      },
      OR: [
        {
          location: {
            warehouseId: workOrder.warehouseId,
          },
        },
        {
          importEntry: {
            warehouseId: workOrder.warehouseId,
          },
        },
      ],
    },
    orderBy: fifoInventoryOrderBy,
    select: {
      id: true,
      productId: true,
      itemNumber: true,
      dyeLot: true,
      stockCount: true,
      reservedStockCount: true,
      cost: true,
      freight: true,
      fifoReceivedAt: true,
      createdAt: true,
      cutLogs: {
        select: {
          cut: true,
        },
      },
      location: {
        select: {
          locationCode: true,
          warehouse: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      importEntry: {
        select: {
          warehouse: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      product: {
        select: {
          category: {
            select: {
              stockUnit: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  })

  return inventories
    .map((inventory) => toInventoryAllocationOptionRecord(inventory))
    .filter((inventory): inventory is InventoryAllocationOptionRecord => Boolean(inventory))
    .filter((inventory) => inventory.availableToAllocate > 0)
}

export async function findActiveWorkOrderAllocationRun(
  workOrderId: string,
  client: WorkOrderAllocationDbClient = db,
) {
  const run = await client.flooringWorkOrderAllocationRun.findFirst({
    where: {
      workOrderId,
      status: {
        in: ["REQUESTED", "QUEUED", "PROCESSING"],
      },
    },
    orderBy: {
      requestedAt: "desc",
    },
    select: allocationRunSelect,
  })

  return run ? toWorkOrderAllocationRunRecord(run) : null
}

export async function findWorkOrderAllocationRunBySourceVersion(
  workOrderId: string,
  sourceVersion: Date,
  client: WorkOrderAllocationDbClient = db,
) {
  const run = await client.flooringWorkOrderAllocationRun.findUnique({
    where: {
      workOrderId_sourceVersion: {
        workOrderId,
        sourceVersion,
      },
    },
    select: allocationRunSelect,
  })

  return run ? toWorkOrderAllocationRunRecord(run) : null
}

export async function getLatestWorkOrderAllocationRun(
  workOrderId: string,
  client: WorkOrderAllocationDbClient = db,
) {
  const run = await client.flooringWorkOrderAllocationRun.findFirst({
    where: { workOrderId },
    orderBy: {
      requestedAt: "desc",
    },
    select: allocationRunSelect,
  })

  return run ? toWorkOrderAllocationRunRecord(run) : null
}

export async function createWorkOrderAllocationRun(
  input: {
    id?: string
    workOrderId: string
    requestedByUserId: string
    sourceVersion: Date
    idempotencyKey: string
    requestId?: string | null
    requestedAt?: Date
  },
  client: WorkOrderAllocationDbClient = db,
) {
  const run = await client.flooringWorkOrderAllocationRun.create({
    data: {
      id: input.id,
      workOrderId: input.workOrderId,
      requestedByUserId: input.requestedByUserId,
      sourceVersion: input.sourceVersion,
      idempotencyKey: input.idempotencyKey,
      requestId: input.requestId ?? null,
      requestedAt: input.requestedAt ?? new Date(),
    },
    select: allocationRunSelect,
  })

  return toWorkOrderAllocationRunRecord(run)
}

export async function queueWorkOrderAllocationRun(
  input: {
    allocationRunId: string
    queueJobId: string
    queuedAt?: Date
  },
  client: WorkOrderAllocationDbClient = db,
) {
  const result = await client.flooringWorkOrderAllocationRun.updateMany({
    where: {
      id: input.allocationRunId,
      status: "REQUESTED",
    },
    data: {
      status: "QUEUED",
      queueJobId: input.queueJobId,
      queuedAt: input.queuedAt ?? new Date(),
    },
  })

  return result.count > 0
}

export async function startWorkOrderAllocationRun(
  allocationRunId: string,
  client: WorkOrderAllocationDbClient = db,
) {
  const result = await client.flooringWorkOrderAllocationRun.updateMany({
    where: {
      id: allocationRunId,
      status: "QUEUED",
    },
    data: {
      status: "PROCESSING",
      startedAt: new Date(),
      failedAt: null,
      failureCode: null,
      failureMessage: null,
    },
  })

  return result.count > 0
}

export async function completeWorkOrderAllocationRun(
  input: {
    allocationRunId: string
    allocatedRowCount: number
    shortageCount: number
    completedAt?: Date
  },
  client: WorkOrderAllocationDbClient = db,
) {
  const result = await client.flooringWorkOrderAllocationRun.updateMany({
    where: {
      id: input.allocationRunId,
      status: "PROCESSING",
    },
    data: {
      status: "COMPLETED",
      completedAt: input.completedAt ?? new Date(),
      allocatedRowCount: input.allocatedRowCount,
      shortageCount: input.shortageCount,
      failureCode: null,
      failureMessage: null,
    },
  })

  return result.count > 0
}

export async function failWorkOrderAllocationRun(
  input: {
    allocationRunId: string
    failureMessage: string
    failureCode?: string | null
    failedAt?: Date
  },
  client: WorkOrderAllocationDbClient = db,
) {
  const result = await client.flooringWorkOrderAllocationRun.updateMany({
    where: {
      id: input.allocationRunId,
      status: {
        in: ["REQUESTED", "QUEUED", "PROCESSING"],
      },
    },
    data: {
      status: "FAILED",
      failedAt: input.failedAt ?? new Date(),
      failureCode: input.failureCode ?? null,
      failureMessage: input.failureMessage,
    },
  })

  return result.count > 0
}

export async function supersedeWorkOrderAllocationRun(
  input: {
    allocationRunId: string
  },
  client: WorkOrderAllocationDbClient = db,
) {
  const result = await client.flooringWorkOrderAllocationRun.updateMany({
    where: {
      id: input.allocationRunId,
      status: {
        in: ["REQUESTED", "QUEUED", "PROCESSING"],
      },
    },
    data: {
      status: "SUPERSEDED",
      failedAt: null,
      failureCode: null,
      failureMessage: null,
      completedAt: null,
    },
  })

  return result.count > 0
}

export async function supersedePendingWorkOrderAllocationRuns(
  input: {
    workOrderId: string
    excludeSourceVersion?: Date
  },
  client: WorkOrderAllocationDbClient = db,
) {
  return client.flooringWorkOrderAllocationRun.updateMany({
    where: {
      workOrderId: input.workOrderId,
      status: {
        in: ["REQUESTED", "QUEUED"],
      },
      ...(input.excludeSourceVersion
        ? {
            sourceVersion: {
              not: input.excludeSourceVersion,
            },
          }
        : {}),
    },
    data: {
      status: "SUPERSEDED",
      failedAt: null,
      failureCode: null,
      failureMessage: null,
      completedAt: null,
    },
  })
}

export async function getWorkOrderAllocationRunById(
  allocationRunId: string,
  client: WorkOrderAllocationDbClient = db,
) {
  const run = await client.flooringWorkOrderAllocationRun.findUniqueOrThrow({
    where: { id: allocationRunId },
    select: allocationRunSelect,
  })

  return toWorkOrderAllocationRunRecord(run)
}

export async function getWorkOrderAutoAllocationSource(
  allocationRunId: string,
  client: WorkOrderAllocationDbClient = db,
): Promise<WorkOrderAutoAllocationSourceRecord> {
  const allocationRun = await getWorkOrderAllocationRunById(allocationRunId, client)
  const workOrder = await client.flooringWorkOrder.findUniqueOrThrow({
    where: { id: allocationRun.workOrderId },
    select: {
      id: true,
      warehouseId: true,
      updatedAt: true,
      items: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          productId: true,
          quantity: true,
          allocations: {
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
            select: allocationSelect,
          },
        },
      },
    },
  })

  if (!workOrder.warehouseId) {
    throw new Error("Work order must have a warehouse before auto-allocation can run")
  }

  const inventoryCandidates = await listAutoAllocationInventoryCandidates(workOrder.id, client)

  return {
    allocationRun,
    workOrder: {
      id: workOrder.id,
      warehouseId: workOrder.warehouseId,
      sourceVersion: workOrder.updatedAt.toISOString(),
    },
    items: workOrder.items.map((item) => {
      const allocations = item.allocations.map(toWorkOrderItemAllocationRecord)
      return {
        id: item.id,
        productId: item.productId,
        quantity: item.quantity.toString(),
        manualAllocations: allocations.filter((allocation) => allocation.method === "MANUAL"),
        autoAllocations: allocations.filter((allocation) => allocation.method === "AUTO"),
      }
    }),
    inventoryCandidates,
  }
}
