import { Prisma } from "@builders/db"
import type {
  TemplateSnapshot,
  TemplateSnapshotMaterialRow,
  TemplateSnapshotServiceRow,
  TemplateSnapshotSalesRepRow,
} from "@/modules/templates/data/template-snapshot-queries"
import type { TemplateSyncApplyResult } from "@/modules/templates/domain/template-snapshot"
import { buildSyncPlan } from "@/modules/templates/domain/template-snapshot"

export async function applyTemplateSnapshotToNewWorkOrder(args: {
  tx: Prisma.TransactionClient
  workOrderId: string
  snapshot: TemplateSnapshot
  includeMaterialItems?: boolean
  includeServiceItems?: boolean
  includeSalesReps?: boolean
}) {
  if (args.includeMaterialItems !== false) {
    for (const item of args.snapshot.items) {
      await args.tx.flooringWorkOrderItem.create({
        data: {
          workOrderId: args.workOrderId,
          sourceTemplateItemId: item.sourceTemplateItemId,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          notes: item.notes,
          allocationStatus: "NOT_STARTED",
          changeOrderStatus: item.changeOrderStatus,
        },
      })
    }
  }

  if (args.includeServiceItems !== false) {
    for (const item of args.snapshot.serviceItems) {
      await args.tx.flooringWorkOrderServiceItem.create({
        data: {
          workOrderId: args.workOrderId,
          sourceTemplateServiceItemId: item.sourceTemplateServiceItemId,
          serviceId: item.serviceId,
          name: item.name,
          unitId: item.unitId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          notes: item.notes,
        },
      })
    }
  }

  if (args.includeSalesReps !== false) {
    for (const item of args.snapshot.salesReps) {
      await args.tx.flooringWorkOrderSalesRep.create({
        data: {
          workOrderId: args.workOrderId,
          sourceTemplateSalesRepId: item.sourceTemplateSalesRepId,
          contactId: item.contactId,
          percent: item.percent,
        },
      })
    }
  }
}

export async function applyTemplateSync(args: {
  tx: Prisma.TransactionClient
  workOrderId: string
  mode: "overwrite" | "append"
  existingWorkOrder: {
    templateId: string | null
    warehouseId: string | null
    unitType: string | null
    instructions: string | null
  }
  existingMaterialItems: Array<{
    id: string
    sourceTemplateItemId: string | null
    productId: string
    quantity: Prisma.Decimal
    unitPrice: Prisma.Decimal
    notes: string | null
    changeOrderStatus: "SUFFICIENT" | "SHORTAGE" | null
  }>
  existingServiceItems: Array<{
    id: string
    sourceTemplateServiceItemId: string | null
    serviceId: string | null
    name: string
    unitId: string
    quantity: Prisma.Decimal
    unitPrice: Prisma.Decimal
    notes: string | null
  }>
  existingSalesReps: Array<{
    id: string
    sourceTemplateSalesRepId: string | null
    contactId: string
    percent: Prisma.Decimal
  }>
  snapshot: TemplateSnapshot
}): Promise<TemplateSyncApplyResult> {
  const plan = buildSyncPlan(args)

  await args.tx.flooringWorkOrder.update({
    where: { id: args.workOrderId },
    data: {
      templateId: args.snapshot.templateId,
      warehouseId: args.snapshot.warehouseId,
      unitType: args.snapshot.unitType,
      instructions: args.snapshot.instructions,
      templateSyncedAt: new Date(),
      templateSyncMode: args.mode,
      templateSnapshotHash: args.snapshot.hash,
    },
  })

  if (args.mode === "overwrite") {
    for (const item of plan.materialItemsToUpdate) {
      await args.tx.flooringWorkOrderItem.update({
        where: { id: item.existingId },
        data: {
          productId: item.snapshot.productId,
          quantity: item.snapshot.quantity,
          unitPrice: item.snapshot.unitPrice,
          notes: item.snapshot.notes,
          allocationStatus: "NOT_STARTED",
          changeOrderStatus: item.snapshot.changeOrderStatus,
        },
      })
    }

    for (const item of plan.serviceItemsToUpdate) {
      await args.tx.flooringWorkOrderServiceItem.update({
        where: { id: item.existingId },
        data: {
          serviceId: item.snapshot.serviceId,
          name: item.snapshot.name,
          unitId: item.snapshot.unitId,
          quantity: item.snapshot.quantity,
          unitPrice: item.snapshot.unitPrice,
          notes: item.snapshot.notes,
        },
      })
    }

    for (const item of plan.salesRepsToUpdate) {
      await args.tx.flooringWorkOrderSalesRep.update({
        where: { id: item.existingId },
        data: {
          sourceTemplateSalesRepId: item.snapshot.sourceTemplateSalesRepId,
          contactId: item.snapshot.contactId,
          percent: item.snapshot.percent,
        },
      })
    }

    if (plan.materialItemIdsToDelete.length > 0) {
      await args.tx.flooringWorkOrderItem.deleteMany({
        where: {
          id: { in: plan.materialItemIdsToDelete },
        },
      })
    }

    if (plan.serviceItemIdsToDelete.length > 0) {
      await args.tx.flooringWorkOrderServiceItem.deleteMany({
        where: {
          id: { in: plan.serviceItemIdsToDelete },
        },
      })
    }

    if (plan.salesRepIdsToDelete.length > 0) {
      await args.tx.flooringWorkOrderSalesRep.deleteMany({
        where: {
          id: { in: plan.salesRepIdsToDelete },
        },
      })
    }
  }

  if (plan.materialItemsToCreate.length > 0) {
    await args.tx.flooringWorkOrderItem.createMany({
      data: plan.materialItemsToCreate.map((item) => ({
        workOrderId: args.workOrderId,
        sourceTemplateItemId: item.sourceTemplateItemId,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        notes: item.notes,
        allocationStatus: "NOT_STARTED",
        changeOrderStatus: item.changeOrderStatus,
      })),
    })
  }

  if (plan.serviceItemsToCreate.length > 0) {
    await args.tx.flooringWorkOrderServiceItem.createMany({
      data: plan.serviceItemsToCreate.map((item) => ({
        workOrderId: args.workOrderId,
        sourceTemplateServiceItemId: item.sourceTemplateServiceItemId,
        serviceId: item.serviceId,
        name: item.name,
        unitId: item.unitId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        notes: item.notes,
      })),
    })
  }

  if (plan.salesRepsToCreate.length > 0) {
    await args.tx.flooringWorkOrderSalesRep.createMany({
      data: plan.salesRepsToCreate.map((item) => ({
        workOrderId: args.workOrderId,
        sourceTemplateSalesRepId: item.sourceTemplateSalesRepId,
        contactId: item.contactId,
        percent: item.percent,
      })),
    })
  }

  return {
    headerUpdates: plan.headerUpdates,
    rowsToCreate: plan.rowsToCreate,
    rowsToDelete: plan.rowsToDelete,
    counts: plan.counts,
    templateId: args.snapshot.templateId,
    templateSnapshotHash: args.snapshot.hash,
  }
}
