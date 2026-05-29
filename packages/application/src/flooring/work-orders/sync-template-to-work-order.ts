import {
  Prisma,
  createWorkOrderFromTemplateRecord,
  getTemplateById,
  getWorkOrderStatusIdBySlug,
  withDatabaseTransaction,
} from "@builders/db"
import {
  TEMPLATE_SYNC_TEMPLATE_NOT_FOUND_MESSAGE,
  TEMPLATE_SYNC_TEMPLATE_PROPERTY_REQUIRED_MESSAGE,
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
  client?: Prisma.TransactionClient,
): Promise<SyncTemplateToWorkOrderResult> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    let template
    try {
      template = await getTemplateById(input.templateId, c)
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

    if (!template.propertyId) {
      throw new WorkOrderExecutionError({
        code: "TEMPLATE_SYNC_TEMPLATE_INVALID",
        message: TEMPLATE_SYNC_TEMPLATE_PROPERTY_REQUIRED_MESSAGE,
        status: 400,
        field: "propertyId",
      })
    }

    // A template no longer needs a warehouse to be synced. A null template
    // warehouse flows straight through to the work order's nullable warehouseId.

    // Template-created work orders also default to the "None" status.
    const statusId = await getWorkOrderStatusIdBySlug("none", c)

    return createWorkOrderFromTemplateRecord(
      {
        workOrder: {
          propertyId: template.propertyId,
          templateId: template.id,
          managementCompanyId: template.managementCompanyId,
          jobTypeId: template.jobTypeId,
          warehouseId: template.warehouseId,
          statusId,
          unitType: template.unitType ? template.unitType : null,
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
