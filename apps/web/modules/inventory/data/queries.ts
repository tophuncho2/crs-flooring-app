import {
  createPrismaPageLoadIssue,
  getInventoryById as dbGetInventoryById,
  getInventoryDetailById,
  isPrismaNotFoundError,
  listInventory,
  listInventoryOptions,
  withPrismaConnectivityHandling,
  type InventoryDetailRecord,
  type InventoryRecord,
  type PrismaDetailPageResult,
} from "@builders/db"
import type {
  InventoryCategoryOption,
  InventoryProductOption,
  InventoryWarehouseOption,
} from "@builders/domain"

export type InventoryListPageData = {
  initialInventory: InventoryRecord[]
}

export type InventoryFilterOptions = {
  warehouseOptions: InventoryWarehouseOption[]
  categoryOptions: InventoryCategoryOption[]
  productOptions: InventoryProductOption[]
}

async function loadInventoryPageData(): Promise<InventoryListPageData> {
  return {
    initialInventory: await listInventory({ isImported: true }),
  }
}

export async function getInventoryPageData() {
  return withPrismaConnectivityHandling(() => loadInventoryPageData())
}

export async function listInventoryPageFilterOptions(): Promise<InventoryFilterOptions> {
  const options = await listInventoryOptions()
  return {
    warehouseOptions: options.warehouses,
    categoryOptions: options.categories,
    productOptions: options.products,
  }
}

export async function getInventoryById(id: string): Promise<InventoryRecord | null> {
  return dbGetInventoryById(id)
}

export async function getInventoryDetailPageData(
  id: string,
): Promise<
  PrismaDetailPageResult<{
    inventory: InventoryDetailRecord
    locationOptions: Awaited<ReturnType<typeof listInventoryOptions>>["locations"]
    warehouseOptions: Awaited<ReturnType<typeof listInventoryOptions>>["warehouses"]
  }>
> {
  try {
    const [inventory, options] = await Promise.all([
      getInventoryDetailById(id),
      listInventoryOptions(),
    ])

    if (!inventory) {
      return { ok: false, notFound: true }
    }

    return {
      ok: true,
      data: {
        inventory,
        locationOptions: options.locations,
        warehouseOptions: options.warehouses,
      },
    }
  } catch (error) {
    if (isPrismaNotFoundError(error)) {
      return { ok: false, notFound: true }
    }
    return {
      ok: false,
      error: createPrismaPageLoadIssue(error, {
        code: "INVENTORY_DETAIL_LOAD_FAILED",
        title: "Inventory Unavailable",
        message: "The app could not load this inventory record.",
        detail: "The inventory record could not be loaded.",
      }),
    }
  }
}

export type { InventoryRecord, InventoryDetailRecord }
