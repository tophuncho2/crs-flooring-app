import { prisma } from "@builders/db"
import { loadTemplateSnapshot } from "@/modules/templates/data/template-snapshot-queries"
import { applyTemplateSync } from "@/modules/templates/data/template-snapshot-mutations"
import {
  previewTemplateSync,
  type TemplateSyncPreview,
} from "@/modules/templates/domain/template-snapshot"
import { getWorkOrderByIdWithClient } from "@/modules/work-orders/queries"
import { TEMPLATE_SYNC_POLICY } from "@/modules/work-orders/contracts"
import type { SyncTemplateToWorkOrderInput } from "@/modules/work-orders/validators"
export type SyncTemplateToWorkOrderResult = TemplateSyncPreview & {
  mode: "overwrite" | "append"
  dryRun: boolean
  policy: typeof TEMPLATE_SYNC_POLICY
  workOrder: Awaited<ReturnType<typeof getWorkOrderByIdWithClient>> | null
}

export async function syncTemplateToWorkOrder(workOrderId: string, input: SyncTemplateToWorkOrderInput): Promise<SyncTemplateToWorkOrderResult> {
  const result = await prisma.$transaction(async (tx) => {
    const existingWorkOrder = await tx.flooringWorkOrder.findUniqueOrThrow({
      where: { id: workOrderId },
      select: {
        id: true,
        propertyId: true,
        templateId: true,
        warehouseId: true,
        unitType: true,
        instructions: true,
        isComplete: true,
        updatedAt: true,
      },
    })

    if (existingWorkOrder.isComplete) {
      throw { message: "Completed work orders cannot sync templates", field: "isComplete" }
    }

    if (input.expectedUpdatedAt && existingWorkOrder.updatedAt.getTime() !== input.expectedUpdatedAt.getTime()) {
      throw { message: "Work order changed before sync completed. Refresh and try again.", field: "updatedAt", status: 409 }
    }

    const [templateSnapshot, existingMaterialItems, existingServiceItems, existingSalesReps] = await Promise.all([
      loadTemplateSnapshot(input.templateId, tx),
      tx.flooringWorkOrderItem.findMany({
        where: { workOrderId },
        select: {
          id: true,
          sourceTemplateItemId: true,
          productId: true,
          quantity: true,
          unitPrice: true,
          notes: true,
          changeOrderStatus: true,
        },
      }),
      tx.flooringWorkOrderServiceItem.findMany({
        where: { workOrderId },
        select: {
          id: true,
          sourceTemplateServiceItemId: true,
          serviceId: true,
          name: true,
          unitId: true,
          quantity: true,
          unitPrice: true,
          notes: true,
        },
      }),
      tx.flooringWorkOrderSalesRep.findMany({
        where: { workOrderId },
        select: {
          id: true,
          sourceTemplateSalesRepId: true,
          contactId: true,
          percent: true,
        },
      }),
    ])

    if (existingWorkOrder.propertyId !== templateSnapshot.propertyId) {
      throw { message: "Template property must match the selected work order property", field: "templateId" }
    }

    const preview = previewTemplateSync({
      mode: input.mode,
      existingWorkOrder: {
        templateId: existingWorkOrder.templateId,
        warehouseId: existingWorkOrder.warehouseId,
        unitType: existingWorkOrder.unitType,
        instructions: existingWorkOrder.instructions,
      },
      existingMaterialItems,
      existingServiceItems,
      existingSalesReps,
      snapshot: templateSnapshot,
    })

    if (input.dryRun) {
      return {
        mode: input.mode,
        dryRun: true,
        policy: TEMPLATE_SYNC_POLICY,
        workOrder: null,
        headerUpdates: preview.headerUpdates,
        rowsToCreate: preview.rowsToCreate,
        rowsToDelete: preview.rowsToDelete,
        counts: preview.counts,
      }
    }

    await applyTemplateSync({
      tx,
      workOrderId,
      mode: input.mode,
      existingWorkOrder: {
        templateId: existingWorkOrder.templateId,
        warehouseId: existingWorkOrder.warehouseId,
        unitType: existingWorkOrder.unitType,
        instructions: existingWorkOrder.instructions,
      },
      existingMaterialItems,
      existingServiceItems,
      existingSalesReps,
      snapshot: templateSnapshot,
    })

    return {
      mode: input.mode,
      dryRun: false,
      policy: TEMPLATE_SYNC_POLICY,
      workOrder: await getWorkOrderByIdWithClient(tx, workOrderId),
      headerUpdates: preview.headerUpdates,
      rowsToCreate: preview.rowsToCreate,
      rowsToDelete: preview.rowsToDelete,
      counts: preview.counts,
    }
  })

  return result
}
