import {
  createPrismaPageLoadIssue,
  getWorkOrderDetailById,
  isPrismaNotFoundError,
  listCutLogsForWorkOrderItemIds,
  listWarehouseOptions,
  listWorkOrderFiles,
  listWorkOrderMaterialItems,
  type PrismaDetailPageResult,
  type WorkOrderFileRow,
} from "@builders/db"
import type {
  CutLogRow,
  WorkOrderDetail,
  WorkOrderMaterialItemRow,
} from "@builders/domain"
import { withLoaderTiming } from "@/server/telemetry/loader-timing"

// Re-export Prisma payload types so module UI files don't have to
// import `@builders/db` directly. Per `apps/web/modules/CLAUDE.md`,
// db imports stay inside `data/`.
export type { WorkOrderFileRow }

export type WorkOrderFormOptionSet = {
  warehouseOptions: Array<{ id: string; name: string }>
}

// Property / management-company / template / product / category / job-type
// options are NOT pre-fetched here. Those fields are powered by async pickers
// (PropertyPicker / ManagementCompanyPicker / TemplatePicker / ProductPicker /
// CategoryPicker / JobTypePicker) which call /api/{...}/options on demand;
// read-only labels come from joined fields on `WorkOrderDetail` and
// `WorkOrderMaterialItemRow`.
export async function getWorkOrderFormOptions(): Promise<WorkOrderFormOptionSet> {
  return withLoaderTiming({ loader: "flooring.work-orders.options" }, async () => {
    const warehouses = await listWarehouseOptions()
    return {
      warehouseOptions: warehouses.map((w) => ({ id: w.id, name: w.name })),
    }
  })
}

export type WorkOrderDetailPageData = {
  workOrder: WorkOrderDetail
  materialItems: WorkOrderMaterialItemRow[]
  cutLogsByWorkOrderItemId: Record<string, CutLogRow[]>
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
    const cutLogsByWorkOrderItemId: Record<string, CutLogRow[]> = {}
    for (const mi of materialItems) cutLogsByWorkOrderItemId[mi.id] = []
    for (const row of cutLogRows) {
      if (row.workOrderItemId === null) continue
      const bucket = cutLogsByWorkOrderItemId[row.workOrderItemId]
      if (bucket === undefined) continue
      bucket.push(row)
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
