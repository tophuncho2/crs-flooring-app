import {
  createPrismaPageLoadIssue,
  getWorkOrderDetailById,
  getWorkOrderForFileGeneration,
  getWorkOrderNeighborsById,
  getWorkOrderPrintCountsByDocumentType,
  isPrismaNotFoundError,
  listAdjustmentsForWorkOrder,
  listPaymentsByWorkOrder,
  listWorkOrderDocumentTypeOptions,
  listWorkOrderEntityInvolvements,
  listWorkOrderMaterialItems,
  listWorkOrderPlannedPayments,
  type PrismaDetailPageResult,
  type WorkOrderNeighbors,
  type WorkOrderPrintCountByDocumentType,
} from "@builders/db"
import type {
  EnrichedInventoryAdjustmentRow,
  Payment,
  WorkOrderDetail,
  WorkOrderDocumentTypeOption,
  WorkOrderEntityInvolvementRow,
  WorkOrderFileGenerationInput,
  WorkOrderMaterialItemRow,
  WorkOrderPlannedPaymentRow,
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
  /**
   * The work order's planned payments (per-job payment plan), ordered createdAt
   * asc. Loaded separately (sibling-prop pattern) and threaded into the record
   * panel's own state — NOT nested into WorkOrderDetail.
   */
  plannedPayments: WorkOrderPlannedPaymentRow[]
  /**
   * The work order's entity involvements (why an entity is involved), ordered
   * createdAt asc. Loaded separately (sibling-prop pattern) and threaded into the
   * record panel's own state — NOT nested into WorkOrderDetail.
   */
  entityInvolvements: WorkOrderEntityInvolvementRow[]
  /**
   * The real payments (`FlooringPayment`) linked to this work order, newest-first
   * (createdAt desc). Loaded separately (sibling-prop pattern) and read straight
   * from the server prop by the read-only Payments section — NOT frozen in state
   * (like adjustmentsForWorkOrder; a create/delete re-runs this loader).
   */
  payments: Payment[]
  /**
   * Per-doc-type print counts for this work order (by snapshotted doc-type name),
   * rendered read-only in the primary section beneath the actor cells.
   */
  printCounts: WorkOrderPrintCountByDocumentType[]
}

export async function getWorkOrderDetailPageData(
  id: string,
): Promise<PrismaDetailPageResult<WorkOrderDetailPageData>> {
  try {
    const [
      workOrder,
      materialItems,
      adjustmentsForWorkOrder,
      plannedPayments,
      entityInvolvements,
      payments,
      printCounts,
    ] = await Promise.all([
      getWorkOrderDetailById(id),
      listWorkOrderMaterialItems(id),
      listAdjustmentsForWorkOrder(id),
      listWorkOrderPlannedPayments(id),
      listWorkOrderEntityInvolvements(id),
      listPaymentsByWorkOrder(id),
      getWorkOrderPrintCountsByDocumentType(id),
    ])

    if (!workOrder) {
      return { ok: false, notFound: true }
    }

    return {
      ok: true,
      data: {
        workOrder,
        materialItems,
        adjustmentsForWorkOrder,
        plannedPayments,
        entityInvolvements,
        payments,
        printCounts,
      },
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
  /**
   * All doc types (id/name/color/printConfig) — the configurator's doc-type
   * selector renders these and seeds its checkboxes from the selected one.
   */
  documentTypes: WorkOrderDocumentTypeOption[]
  /** Per-doc-type print counts for THIS work order (by snapshotted name). */
  printCounts: WorkOrderPrintCountByDocumentType[]
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
    const [workOrder, neighbors, documentTypes, printCounts] = await Promise.all([
      getWorkOrderForFileGeneration(id),
      getWorkOrderNeighborsById(id),
      listWorkOrderDocumentTypeOptions(),
      getWorkOrderPrintCountsByDocumentType(id),
    ])
    return { ok: true, data: { workOrder, neighbors, documentTypes, printCounts } }
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
