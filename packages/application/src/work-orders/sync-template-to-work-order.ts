import {
  Prisma,
  createWorkOrderFromTemplateRecord,
  getTemplateById,
  withDatabaseTransaction,
} from "@builders/db"
import {
  TEMPLATE_SYNC_TEMPLATE_NOT_FOUND_MESSAGE,
  type WorkOrderDetail,
  type WorkOrderMaterialItemRow,
  type WorkOrderPlannedPaymentRow,
} from "@builders/domain"
import { WorkOrderExecutionError } from "./errors.js"

export type SyncTemplateToWorkOrderInput = {
  templateId: string
}

export type SyncTemplateToWorkOrderResult = {
  workOrder: WorkOrderDetail
  items: WorkOrderMaterialItemRow[]
  plannedPayments: WorkOrderPlannedPaymentRow[]
}

function notesOrNull(value: string): string | null {
  return value ? value : null
}

export async function syncTemplateToWorkOrderUseCase(
  input: SyncTemplateToWorkOrderInput,
  actorEmail: string,
  client?: Prisma.TransactionClient,
): Promise<SyncTemplateToWorkOrderResult> {
  if (!actorEmail || !actorEmail.trim()) {
    throw new Error("syncTemplateToWorkOrderUseCase requires a non-empty actorEmail")
  }
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    let template
    try {
      template = await getTemplateById(input.templateId, { withNeighbors: false }, c)
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new WorkOrderExecutionError({
          code: "TEMPLATE_SYNC_TEMPLATE_NOT_FOUND",
          message: TEMPLATE_SYNC_TEMPLATE_NOT_FOUND_MESSAGE,
          status: 404,
          field: "templateId",
        })
      }
      throw error
    }

    // A template no longer needs a property to be synced. A property-less
    // template materializes a property-less work order — the nullable template
    // propertyId flows straight through to the work order's nullable propertyId.

    // A template no longer needs a warehouse to be synced. A null template
    // warehouse flows straight through to the work order's nullable warehouseId.

    return createWorkOrderFromTemplateRecord(
      {
        actorEmail,
        workOrder: {
          propertyId: template.propertyId,
          templateId: template.id,
          jobTypeId: template.jobTypeId,
          warehouseId: template.warehouseId,
          unitType: template.unitType ? template.unitType : null,
          // Snapshot the template's (live property-joined) address into the
          // work order's own editable address columns at sync time — mirrors
          // the record-form overwrite-on-pick. A property-less template leaves
          // these NULL rather than "".
          streetAddress: template.propertyStreetAddress || null,
          city: template.propertyCity || null,
          state: template.propertyState || null,
          postalCode: template.propertyPostalCode || null,
          // Customer name is user-typed copy that carries forward from the
          // template to each synced work order.
          customerName: template.customerName ? template.customerName : null,
          description: template.description ? template.description : null,
          // installerInstructions are installer-facing copy that survives
          // the template -> work order materialization. internalNotes are
          // template back-office annotations and are intentionally NOT
          // copied — each work order gets its own internal notes scratch.
          installerInstructions: template.installerInstructions
            ? template.installerInstructions
            : null,
        },
        // Deliberately enumerated (never spread): a WO item carries only
        // productId / quantity / unitId / notes. The planned product's `cost`
        // is intentionally NOT carried into the work order — do not add it here.
        items: template.plannedProducts.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          // Carry the template item's editable unit FK forward to the WO item
          // (UoM epic 2C) — replaces the frozen sendUnit* copy.
          unitId: item.unitId,
          notes: notesOrNull(item.notes),
        })),
        // Deliberately enumerated (never spread): carry amount / direction /
        // notes / entityId. Unlike planned products (which drop `cost`),
        // planned payments copy 1:1.
        plannedPayments: template.plannedPayments.map((payment) => ({
          amount: payment.amount,
          direction: payment.direction,
          notes: notesOrNull(payment.notes),
          entityId: payment.entityId,
        })),
      },
      c,
    )
  })
}
