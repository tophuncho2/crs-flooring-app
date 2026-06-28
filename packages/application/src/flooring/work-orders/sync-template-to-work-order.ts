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
} from "@builders/domain"
import { WorkOrderExecutionError } from "./errors.js"

export type SyncTemplateToWorkOrderInput = {
  templateId: string
}

export type SyncTemplateToWorkOrderResult = {
  workOrder: WorkOrderDetail
  items: WorkOrderMaterialItemRow[]
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
          description: template.description ? template.description : null,
          // installerInstructions are installer-facing copy that survives
          // the template -> work order materialization. internalNotes are
          // template back-office annotations and are intentionally NOT
          // copied — each work order gets its own internal notes scratch.
          installerInstructions: template.installerInstructions
            ? template.installerInstructions
            : null,
        },
        items: template.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          sendUnitName: item.sendUnitName,
          sendUnitAbbrev: item.sendUnitAbbrev,
          notes: notesOrNull(item.notes),
          sourceTemplateItemId: item.id,
        })),
      },
      c,
    )
  })
}
