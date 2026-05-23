import {
  createPrismaPageLoadIssue,
  getWorkOrderDetailById,
  getWorkOrderForFileGeneration,
  isPrismaNotFoundError,
  listCutLogsForWorkOrderItemIds,
  listWorkOrderMaterialItems,
  type PrismaDetailPageResult,
  type WorkOrderFileRow,
} from "@builders/db"
import type {
  CutLogRow,
  WorkOrderDetail,
  WorkOrderFileGenerationInput,
  WorkOrderMaterialItemRow,
} from "@builders/domain"

// Re-export Prisma payload types so module UI files don't have to
// import `@builders/db` directly. Per `apps/web/modules/CLAUDE.md`,
// db imports stay inside `data/`. `WorkOrderFileRow` is consumed by
// the files side panel (mutations/queries) even though the row list
// itself is no longer SSR-pre-fetched here.
export type { WorkOrderFileRow }

// All form-option fields are powered by async pickers
// (PropertyPicker / ManagementCompanyPicker / TemplatePicker / ProductPicker /
// CategoryPicker / JobTypePicker / WarehousePicker) which call /api/{...}/options
// on demand; read-only labels come from joined fields on `WorkOrderDetail`
// and `WorkOrderMaterialItemRow`. No SSR pre-fetch of options is required.

export type WorkOrderDetailPageData = {
  workOrder: WorkOrderDetail
  materialItems: WorkOrderMaterialItemRow[]
  cutLogsByWorkOrderItemId: Record<string, CutLogRow[]>
}

export async function getWorkOrderDetailPageData(
  id: string,
): Promise<PrismaDetailPageResult<WorkOrderDetailPageData>> {
  try {
    const [workOrder, materialItems] = await Promise.all([
      getWorkOrderDetailById(id),
      listWorkOrderMaterialItems(id),
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
      data: { workOrder, materialItems, cutLogsByWorkOrderItemId },
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
        detail: "The work order record could not be loaded.",
      }),
    }
  }
}

export type WorkOrderFileGenerationPageData = {
  workOrder: WorkOrderFileGenerationInput
}

/**
 * Server-side loader for the on-demand print views (Work Order Slip /
 * Picking Ticket). Returns the exact `WorkOrderFileGenerationInput` shape
 * the domain HTML builders consume — the same joined snapshot the
 * file-generation worker reads — so the printed output matches the PDF.
 * The underlying read uses `findUniqueOrThrow`, so a missing record
 * surfaces as a Prisma not-found error mapped to `notFound`.
 */
export async function getWorkOrderForFileGenerationPageData(
  id: string,
): Promise<PrismaDetailPageResult<WorkOrderFileGenerationPageData>> {
  try {
    const workOrder = await getWorkOrderForFileGeneration(id)
    return { ok: true, data: { workOrder } }
  } catch (error) {
    if (isPrismaNotFoundError(error)) {
      return { ok: false, notFound: true }
    }
    return {
      ok: false,
      error: createPrismaPageLoadIssue(error, {
        code: "WORK_ORDER_FILE_LOAD_FAILED",
        title: "Work Order Unavailable",
        message: "The app could not load this work order for printing.",
        detail: "The work order record could not be loaded.",
      }),
    }
  }
}
