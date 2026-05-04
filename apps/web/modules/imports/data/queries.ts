import {
  createPrismaPageLoadIssue,
  isPrismaNotFoundError,
  listImportOptions,
  listInventory,
  listStagedInventoryByImport,
  getImportDetailById,
  type ImportDetailRecord,
  type ImportRecord,
  type InventoryRecord,
  type PrismaDetailPageResult,
  type StagedInventoryRecord,
} from "@builders/db"
import type { ImportFormOptions } from "@builders/domain"
import { withLoaderTiming } from "@/modules/shared/engines/common/application/loader-timing"

// Warehouse / product / category options are NOT pre-fetched here.
// Those fields are powered by async pickers (WarehousePicker /
// ProductPicker / CategoryPicker) which call /api/{warehouses,products,categories}/options
// on demand; read-only labels come from joined fields on
// StagedInventoryRow (productName + stockUnit) and ImportDetail
// (warehouseName).
export type ImportFormOptionSet = {
  locationOptions: Array<{
    id: string
    warehouseId: string
    locationCode: string
    shortCode: string
    label: string
  }>
  manufacturerOptions: Array<{ id: string; label: string }>
}

export async function getImportFormOptions(): Promise<ImportFormOptionSet> {
  return withLoaderTiming({ loader: "flooring.imports.options" }, async () => {
    const options: ImportFormOptions = await listImportOptions()
    return {
      locationOptions: options.locations.map((location) => ({
        id: location.id,
        warehouseId: location.warehouseId,
        locationCode: location.locationCode,
        shortCode: location.shortCode,
        label: location.shortCode,
      })),
      manufacturerOptions: options.manufacturers.map((manufacturer) => ({
        id: manufacturer.id,
        label: manufacturer.companyName,
      })),
    }
  })
}

export type ImportDetailPageData = {
  entry: ImportDetailRecord
  stagedRows: StagedInventoryRecord[]
  liveRows: InventoryRecord[]
  locationOptions: ImportFormOptionSet["locationOptions"]
  manufacturerOptions: ImportFormOptionSet["manufacturerOptions"]
}

export async function getImportDetailPageData(
  id: string,
): Promise<PrismaDetailPageResult<ImportDetailPageData>> {
  try {
    const [entry, options, stagedRows, liveRows] = await Promise.all([
      getImportDetailById(id),
      getImportFormOptions(),
      listStagedInventoryByImport(id),
      listInventory({ importEntryId: id }),
    ])

    if (!entry) {
      return { ok: false, notFound: true }
    }

    return {
      ok: true,
      data: {
        entry,
        stagedRows,
        liveRows,
        locationOptions: options.locationOptions,
        manufacturerOptions: options.manufacturerOptions,
      },
    }
  } catch (error) {
    if (isPrismaNotFoundError(error)) {
      return { ok: false, notFound: true }
    }

    return {
      ok: false,
      error: createPrismaPageLoadIssue(error, {
        code: "IMPORT_DETAIL_LOAD_FAILED",
        title: "Import Unavailable",
        message: "The app could not load this import.",
        detail: "The import record or its supporting options could not be loaded.",
      }),
    }
  }
}

export async function getImportCreatePageData() {
  return getImportFormOptions()
}

export type { ImportRecord, ImportDetailRecord }
