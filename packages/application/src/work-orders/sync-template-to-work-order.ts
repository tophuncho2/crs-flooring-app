import {
  Prisma,
  createWorkOrderFromTemplateRecord,
  getTemplateById,
  getWorkOrderDetailById,
  listWorkOrderEntityInvolvements,
  listWorkOrderMaterialItems,
  listWorkOrderPlannedPayments,
} from "@builders/db"
import {
  TEMPLATE_SYNC_TEMPLATE_NOT_FOUND_MESSAGE,
  type WorkOrderDetail,
  type WorkOrderEntityInvolvementRow,
  type WorkOrderMaterialItemRow,
  type WorkOrderPlannedPaymentRow,
} from "@builders/domain"
import { assertActorEmail } from "../shared/assert-actor-email.js"
import { isP2025 } from "../shared/prisma-errors.js"
import { withTxThenEnrich } from "../shared/with-tx-then-enrich.js"
import { WorkOrderExecutionError } from "./errors.js"

export type SyncTemplateToWorkOrderInput = {
  templateId: string
}

export type SyncTemplateToWorkOrderResult = {
  workOrder: WorkOrderDetail
  items: WorkOrderMaterialItemRow[]
  plannedPayments: WorkOrderPlannedPaymentRow[]
  entityInvolvements: WorkOrderEntityInvolvementRow[]
}

function notesOrNull(value: string): string | null {
  return value ? value : null
}

export async function syncTemplateToWorkOrderUseCase(
  input: SyncTemplateToWorkOrderInput,
  actorEmail: string,
  client?: Prisma.TransactionClient,
): Promise<SyncTemplateToWorkOrderResult> {
  assertActorEmail(actorEmail, "syncTemplateToWorkOrderUseCase")

  // Read the source template on the POOL, before opening the tx. It is 5-6
  // relations and cannot be lean (we copy plannedProducts + plannedPayments), so
  // it must not run on the pinned tx connection. The template pre-exists and is
  // not mutated here; a delete in the read→create window trips the new WO's
  // templateId FK (P2003) and rolls the tx back — rare/acceptable.
  let template: Awaited<ReturnType<typeof getTemplateById>>
  try {
    template = await getTemplateById(input.templateId, { withNeighbors: false })
  } catch (error) {
    if (isP2025(error)) {
      throw new WorkOrderExecutionError({
        code: "TEMPLATE_SYNC_TEMPLATE_NOT_FOUND",
        message: TEMPLATE_SYNC_TEMPLATE_NOT_FOUND_MESSAGE,
        status: 404,
        field: "templateId",
      })
    }
    throw error
  }

  // A property-less / warehouse-less template flows its nulls straight through to
  // the work order's nullable columns.
  return withTxThenEnrich(
    (c) =>
      createWorkOrderFromTemplateRecord(
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
            // installerInstructions are installer-facing copy that survives the
            // template -> work order materialization. internalNotes are template
            // back-office annotations and are intentionally NOT copied — each
            // work order gets its own internal notes scratch.
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
          // notes / entityId / paymentPurposeId. Unlike planned products (which
          // drop `cost`), planned payments copy 1:1.
          plannedPayments: template.plannedPayments.map((payment) => ({
            amount: payment.amount,
            direction: payment.direction,
            notes: notesOrNull(payment.notes),
            entityId: payment.entityId,
            paymentPurposeId: payment.paymentPurposeId,
          })),
          // Deliberately enumerated (never spread): carry entityId +
          // involvementType. The row's involvementType is ""-when-unset; the write
          // repo coalesces "" → NULL, so it passes through verbatim.
          entityInvolvements: template.entityInvolvements.map((involvement) => ({
            entityId: involvement.entityId,
            involvementType: involvement.involvementType,
          })),
        },
        c,
      ),
    // Enrich the full result on the POOL after commit. Promise.all is safe here —
    // each read runs on its own pooled connection, not the pinned tx.
    async ({ id }) => {
      const [workOrder, items, plannedPayments, entityInvolvements] = await Promise.all([
        getWorkOrderDetailById(id, { withNeighbors: false }),
        listWorkOrderMaterialItems(id),
        listWorkOrderPlannedPayments(id),
        listWorkOrderEntityInvolvements(id),
      ])
      return { workOrder, items, plannedPayments, entityInvolvements }
    },
    () => {
      throw new Error("syncTemplateToWorkOrderUseCase: work order not found after sync")
    },
    { client },
  )
}
