import {
  createPrismaPageLoadIssue,
  getWorkOrderDetailById,
  isPrismaNotFoundError,
  listCategories,
  listCutLogsForWorkOrderItemIds,
  listJobTypeOptions,
  listManagementCompanyOptions,
  listProductOptions,
  listPropertyOptions,
  listTemplateOptions,
  listWarehouseOptions,
  listWorkOrderFiles,
  listWorkOrderMaterialItems,
  type PrismaDetailPageResult,
  type WorkOrderFileRow,
} from "@builders/db"
import {
  normalizeWorkOrderItemPendingCutLogRow,
  type WorkOrderDetail,
  type WorkOrderItemPendingCutLogRow,
  type WorkOrderMaterialItemRow,
} from "@builders/domain"
import { withLoaderTiming } from "@/server/telemetry/loader-timing"

// Re-export Prisma payload types so module UI files don't have to
// import `@builders/db` directly. Per `apps/web/modules/CLAUDE.md`,
// db imports stay inside `data/`.
export type { WorkOrderFileRow }

export type WorkOrderFormOptionSet = {
  propertyOptions: Array<{
    id: string
    label: string
    streetAddress: string
    city: string
    state: string
    postalCode: string
    instructions: string
  }>
  warehouseOptions: Array<{ id: string; name: string }>
  jobTypeOptions: Array<{ id: string; name: string }>
  managementCompanyOptions: Array<{ id: string; name: string }>
  templateOptions: Array<{ id: string; templateNumber: string; unitType: string }>
  productOptions: Array<{
    id: string
    label: string
    categoryId: string
    sendUnitAbbrev: string
    stockUnitAbbrev: string
  }>
  categoryOptions: Array<{ id: string; label: string }>
}

export async function getWorkOrderFormOptions(): Promise<WorkOrderFormOptionSet> {
  return withLoaderTiming({ loader: "flooring.work-orders.options" }, async () => {
    const [
      properties,
      warehouses,
      jobTypes,
      managementCompanies,
      templates,
      products,
      categories,
    ] = await Promise.all([
      listPropertyOptions(),
      listWarehouseOptions(),
      listJobTypeOptions(),
      listManagementCompanyOptions(),
      listTemplateOptions(),
      listProductOptions(),
      listCategories(),
    ])
    return {
      propertyOptions: properties.map((p) => ({
        id: p.id,
        label: p.name,
        streetAddress: p.streetAddress,
        city: p.city,
        state: p.state,
        postalCode: p.postalCode,
        instructions: p.instructions,
      })),
      warehouseOptions: warehouses.map((w) => ({ id: w.id, name: w.name })),
      jobTypeOptions: jobTypes.map((j) => ({ id: j.id, name: j.name })),
      managementCompanyOptions: managementCompanies.map((m) => ({ id: m.id, name: m.name })),
      templateOptions: templates.map((t) => ({
        id: t.id,
        templateNumber: t.templateNumber,
        unitType: t.unitType,
      })),
      productOptions: products.map((p) => ({
        id: p.id,
        label: p.name,
        categoryId: p.categoryId ?? "",
        sendUnitAbbrev: p.sendUnitAbbrev ?? "",
        stockUnitAbbrev: "",
      })),
      categoryOptions: categories.map((c) => ({ id: c.id, label: c.name })),
    }
  })
}

export type WorkOrderDetailPageData = {
  workOrder: WorkOrderDetail
  materialItems: WorkOrderMaterialItemRow[]
  cutLogsByWorkOrderItemId: Record<string, WorkOrderItemPendingCutLogRow[]>
  files: WorkOrderFileRow[]
  options: WorkOrderFormOptionSet
}

export async function getWorkOrderDetailPageData(
  id: string,
): Promise<PrismaDetailPageResult<WorkOrderDetailPageData>> {
  try {
    const [workOrder, materialItems, files, options] = await Promise.all([
      getWorkOrderDetailById(id),
      listWorkOrderMaterialItems(id),
      listWorkOrderFiles(id),
      getWorkOrderFormOptions(),
    ])

    if (!workOrder) {
      return { ok: false, notFound: true }
    }

    const cutLogRows = await listCutLogsForWorkOrderItemIds(materialItems.map((mi) => mi.id))
    const cutLogsByWorkOrderItemId: Record<string, WorkOrderItemPendingCutLogRow[]> = {}
    for (const mi of materialItems) cutLogsByWorkOrderItemId[mi.id] = []
    for (const row of cutLogRows) {
      if (row.workOrderItemId === null) continue
      const bucket = cutLogsByWorkOrderItemId[row.workOrderItemId]
      if (bucket === undefined) continue
      bucket.push(normalizeWorkOrderItemPendingCutLogRow(row))
    }

    return {
      ok: true,
      data: { workOrder, materialItems, cutLogsByWorkOrderItemId, files, options },
    }
  } catch (error) {
    if (isPrismaNotFoundError(error)) {
      return { ok: false, notFound: true }
    }
    return {
      ok: false,
      error: createPrismaPageLoadIssue(error, {
        code: "WORK_ORDER_DETAIL_LOAD_FAILED",
        title: "Work Order Unavailable",
        message: "The app could not load this work order.",
        detail: "The work order record or its supporting options could not be loaded.",
      }),
    }
  }
}

export async function getWorkOrderCreatePageData() {
  return getWorkOrderFormOptions()
}
