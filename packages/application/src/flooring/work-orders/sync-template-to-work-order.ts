import {
  Prisma,
  createWorkOrderFromTemplateRecord,
  getTemplateById,
  withDatabaseTransaction,
} from "@builders/db"
import {
  TEMPLATE_SYNC_TEMPLATE_NOT_FOUND_MESSAGE,
  TEMPLATE_SYNC_TEMPLATE_PROPERTY_REQUIRED_MESSAGE,
  TEMPLATE_SYNC_TEMPLATE_WAREHOUSE_REQUIRED_MESSAGE,
  buildTemplateSnapshotPayload,
  type WorkOrderDetail,
  type WorkOrderMaterialItemRow,
} from "@builders/domain"
import { sha256Hex } from "@builders/lib/hashing"
import { WorkOrderExecutionError } from "./errors.js"

export const TEMPLATE_SYNC_MODE_COPY = "copy"

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

    if (!template.warehouseId) {
      throw new WorkOrderExecutionError({
        code: "TEMPLATE_SYNC_TEMPLATE_INVALID",
        message: TEMPLATE_SYNC_TEMPLATE_WAREHOUSE_REQUIRED_MESSAGE,
        status: 400,
        field: "warehouseId",
      })
    }

    const snapshotHash = sha256Hex(buildTemplateSnapshotPayload(template))
    const syncedAt = new Date()

    return createWorkOrderFromTemplateRecord(
      {
        workOrder: {
          propertyId: template.propertyId,
          templateId: template.id,
          managementCompanyId: template.managementCompanyId,
          jobTypeId: template.jobTypeId,
          warehouseId: template.warehouseId,
          unitType: template.unitType ? template.unitType : null,
          description: template.description ? template.description : null,
          instructions: template.instructions ? template.instructions : null,
          notes: notesOrNull(template.templateNotes),
          templateSyncedAt: syncedAt,
          templateSyncMode: TEMPLATE_SYNC_MODE_COPY,
          templateSnapshotHash: snapshotHash,
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
