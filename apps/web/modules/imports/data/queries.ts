import {
  createPrismaPageLoadIssue,
  getProductPickerOptionsByIds,
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
import type { ImportFormOptions, ProductPickerOption } from "@builders/domain"
import { withLoaderTiming } from "@/modules/shared/engines/common/application/loader-timing"

export type ImportFormOptionSet = {
  warehouseOptions: Array<{ id: string; name: string }>
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
      warehouseOptions: options.warehouses.map((warehouse) => ({ id: warehouse.id, name: warehouse.name })),
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

async function getStagedRowPickerOptions(
  rows: ReadonlyArray<StagedInventoryRecord>,
): Promise<Record<string, ProductPickerOption>> {
  const productIds = rows
    .map((row) => row.productId)
    .filter((id): id is string => typeof id === "string" && id.length > 0)
  if (productIds.length === 0) return {}
  const options = await getProductPickerOptionsByIds(productIds)
  const optionById = new Map(options.map((option) => [option.id, option]))
  const result: Record<string, ProductPickerOption> = {}
  for (const row of rows) {
    const option = optionById.get(row.productId)
    if (option) result[row.id] = option
  }
  return result
}

export type ImportDetailPageData = {
  entry: ImportDetailRecord
  stagedRows: StagedInventoryRecord[]
  liveRows: InventoryRecord[]
  productPickerOptionsByItemId: Record<string, ProductPickerOption>
  warehouseOptions: ImportFormOptionSet["warehouseOptions"]
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

    const productPickerOptionsByItemId = await getStagedRowPickerOptions(stagedRows)

    return {
      ok: true,
      data: {
        entry,
        stagedRows,
        liveRows,
        productPickerOptionsByItemId,
        warehouseOptions: options.warehouseOptions,
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
