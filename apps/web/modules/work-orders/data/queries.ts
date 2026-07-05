import {
  createPrismaPageLoadIssue,
  getWorkOrderDetailById,
  getWorkOrderForFileGeneration,
  getWorkOrderNeighborsById,
  isPrismaNotFoundError,
  listAdjustmentsForWorkOrder,
  listWorkOrderMaterialItems,
  type PrismaDetailPageResult,
  type WorkOrderNeighbors,
} from "@builders/db"
import type {
  EnrichedInventoryAdjustmentRow,
  WorkOrderDetail,
  WorkOrderFileGenerationInput,
  WorkOrderMaterialItemRow,
} from "@builders/domain"

// All form-option fields are powered by async pickers
// (PropertyPicker / EntityPicker / TemplatePicker / ProductPicker /
// CategoryPicker / JobTypePicker / WarehousePicker) which call /api/{...}/options
// on demand; read-only labels come from joined fields on `WorkOrderDetail`
// and `WorkOrderMaterialItemRow`. No SSR pre-fetch of options is required.

export type WorkOrderDetailPageData = {
  workOrder: WorkOrderDetail
  materialItems: WorkOrderMaterialItemRow[]
  /**
   * Every adjustment linked to this work order (any product), flat and ordered
   * product-name → quantity. The Adjustments grid groups it by product
   * client-side. Material items (requested) and adjustments (outflow) are
   * decoupled — there is no per-material-item bucketing.
   */
  adjustmentsForWorkOrder: EnrichedInventoryAdjustmentRow[]
}

export async function getWorkOrderDetailPageData(
  id: string,
): Promise<PrismaDetailPageResult<WorkOrderDetailPageData>> {
  try {
    const [workOrder, materialItems, adjustmentsForWorkOrder] = await Promise.all([
      getWorkOrderDetailById(id),
      listWorkOrderMaterialItems(id),
      listAdjustmentsForWorkOrder(id),
    ])

    if (!workOrder) {
      return { ok: false, notFound: true }
    }

    return {
      ok: true,
      data: { workOrder, materialItems, adjustmentsForWorkOrder },
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
  /**
   * Adjacent work orders on the global work-order-number line, powering the
   * print view's stepper. `null` at a sequence edge.
   */
  neighbors: WorkOrderNeighbors
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
    const [workOrder, neighbors] = await Promise.all([
      getWorkOrderForFileGeneration(id),
      getWorkOrderNeighborsById(id),
    ])
    return { ok: true, data: { workOrder, neighbors } }
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
