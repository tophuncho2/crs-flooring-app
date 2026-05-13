import {
  createPrismaPageLoadIssue,
  isPrismaNotFoundError,
  listFilterRowsByImport,
  listInventory,
  listStagedInventoryByImport,
  getImportDetailById,
  type ImportDetailRecord,
  type ImportRecord,
  type InventoryRecord,
  type PrismaDetailPageResult,
  type StagedInventoryFilterRecord,
  type StagedInventoryRecord,
} from "@builders/db"
import { withLoaderTiming } from "@/modules/shared/engines/common/application/loader-timing"

// All form-options for the imports record view are powered by async pickers
// (WarehousePicker / ProductPicker / CategoryPicker / ManufacturerPicker)
// which call /api/{warehouses,products,categories,manufacturers}/options on
// demand. Read-only labels come from joined snapshots on ImportDetail
// (warehouseName, manufacturerName), filter rows (productName + stockUnit +
// category), and staged inventory rows.
export type ImportDetailPageData = {
  entry: ImportDetailRecord
  filterRows: StagedInventoryFilterRecord[]
  stagedRows: StagedInventoryRecord[]
  liveRows: InventoryRecord[]
}

export async function getImportDetailPageData(
  id: string,
): Promise<PrismaDetailPageResult<ImportDetailPageData>> {
  return withLoaderTiming({ loader: "flooring.imports.detail" }, async () => {
    try {
      const [entry, filterRows, stagedRows, liveRows] = await Promise.all([
        getImportDetailById(id),
        listFilterRowsByImport(id),
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
          filterRows,
          stagedRows,
          liveRows,
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
          detail: "The import record could not be loaded.",
        }),
      }
    }
  })
}

export type { ImportRecord, ImportDetailRecord }
