import { Prisma } from "@prisma/client"
import { db } from "../../../client.js"

export type WorkOrderAllocationDbClient = Prisma.TransactionClient | typeof db

export type WorkOrderItemAllocationMethodRecord = "MANUAL" | "AUTO"
export type WorkOrderAllocationRunStatusRecord =
  | "REQUESTED"
  | "QUEUED"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "SUPERSEDED"

export const allocationSelect = {
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

export type WorkOrderItemAllocationRow = Prisma.FlooringWorkOrderItemAllocationGetPayload<{
  select: typeof allocationSelect
}>

export const allocationRunSelect = {
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

export type WorkOrderAllocationRunRow = Prisma.FlooringWorkOrderAllocationRunGetPayload<{
  select: typeof allocationRunSelect
}>

export const fifoInventoryOrderBy = [
  { fifoReceivedAt: "asc" as const },
  { itemNumber: "asc" as const },
  { id: "asc" as const },
]

const inventoryAllocationCandidateSelect = {
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
} as const

export type InventoryAllocationCandidateSelectRow = Prisma.FlooringInventoryGetPayload<{
  select: typeof inventoryAllocationCandidateSelect
}>

export type InventoryAllocationCandidateRow = {
  id: string
  productId: string
  warehouseId: string
  warehouseName: string
  fifoReceivedAt: Date
  itemNumber: string
  dyeLot: string
  locationCode: string
  stockUnit: string
  stockCount: Prisma.Decimal
  cutTotal: number
  reservedStockCount: Prisma.Decimal
  cost: Prisma.Decimal | null
  freight: Prisma.Decimal | null
}

export const inventoryAllocationCandidateQuery = {
  orderBy: fifoInventoryOrderBy,
  select: inventoryAllocationCandidateSelect,
} as const

export type InventoryAllocationContextRow = InventoryAllocationCandidateSelectRow

export function toAllocationNumber(value: Prisma.Decimal | number | string | null | undefined) {
  if (value === null || value === undefined) {
    return 0
  }

  const parsed = typeof value === "number" ? value : Number(value.toString())
  return Number.isFinite(parsed) ? parsed : 0
}

export function sumCutTotal(cutLogs: Array<{ cut: Prisma.Decimal }>) {
  return cutLogs.reduce((total, entry) => total + toAllocationNumber(entry.cut), 0)
}

function deriveInventoryWarehouse(inventory: InventoryAllocationCandidateSelectRow) {
  const locationWarehouse = inventory.location?.warehouse
  if (locationWarehouse) {
    return locationWarehouse
  }

  return inventory.importEntry?.warehouse ?? null
}

function deriveInventoryStockUnit(inventory: InventoryAllocationCandidateSelectRow) {
  return inventory.product.category.stockUnit?.name ?? ""
}

export function normalizeInventoryAllocationCandidateRow(
  inventory: InventoryAllocationCandidateSelectRow,
): InventoryAllocationCandidateRow | null {
  const warehouse = deriveInventoryWarehouse(inventory)
  if (!warehouse) {
    return null
  }

  return {
    id: inventory.id,
    productId: inventory.productId,
    warehouseId: warehouse.id,
    warehouseName: warehouse.name,
    fifoReceivedAt: inventory.fifoReceivedAt,
    itemNumber: inventory.itemNumber,
    dyeLot: inventory.dyeLot ?? "",
    locationCode: inventory.location?.locationCode ?? "",
    stockUnit: deriveInventoryStockUnit(inventory),
    stockCount: inventory.stockCount,
    cutTotal: sumCutTotal(inventory.cutLogs),
    reservedStockCount: inventory.reservedStockCount,
    cost: inventory.cost,
    freight: inventory.freight,
  }
}
