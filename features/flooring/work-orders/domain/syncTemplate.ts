import { Prisma } from "@prisma/client"
import { prisma } from "@/server/db/prisma"
import { getWorkOrderById } from "@/features/flooring/work-orders/queries"
import type { SyncTemplateToWorkOrderInput } from "@/features/flooring/work-orders/validators"

type MaterialSnapshotRow = {
  productId: string
  quantity: Prisma.Decimal
  unitPrice: Prisma.Decimal
  notes: string | null
  changeOrderStatus: "SUFFICIENT"
}

type ServiceSnapshotRow = {
  serviceId: string | null
  name: string
  unitId: string
  quantity: Prisma.Decimal
  unitPrice: Prisma.Decimal
  notes: string | null
}

type SyncPreview = {
  rowsToCreate: {
    materialItems: number
    serviceItems: number
  }
  rowsToDelete: {
    materialItems: number
    serviceItems: number
  }
  counts: {
    materialItems: number
    serviceItems: number
  }
}

export type SyncTemplateToWorkOrderResult = SyncPreview & {
  mode: "overwrite" | "append"
  dryRun: boolean
  workOrder: Awaited<ReturnType<typeof getWorkOrderById>> | null
}

function materialKey(row: {
  productId: string
  quantity: { toString(): string }
  unitPrice: { toString(): string }
  notes: string | null
}) {
  return [row.productId, row.quantity.toString(), row.unitPrice.toString(), row.notes ?? ""].join("::")
}

function serviceKey(row: {
  serviceId: string | null
  name: string
  unitId: string
  quantity: { toString(): string }
  unitPrice: { toString(): string }
  notes: string | null
}) {
  return [row.serviceId ?? "", row.name, row.unitId, row.quantity.toString(), row.unitPrice.toString(), row.notes ?? ""].join("::")
}

async function buildTemplateSyncSnapshot(templateId: string, tx: Prisma.TransactionClient) {
  const template = await tx.flooringTemplate.findUniqueOrThrow({
    where: { id: templateId },
    select: {
      propertyId: true,
      items: {
        select: {
          productId: true,
          quantity: true,
          unitPrice: true,
          notes: true,
        },
      },
      serviceItems: {
        select: {
          serviceId: true,
          name: true,
          unitId: true,
          quantity: true,
          unitPrice: true,
          notes: true,
        },
      },
    },
  })

  return {
    propertyId: template.propertyId,
    items: template.items.map<MaterialSnapshotRow>((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      notes: item.notes,
      changeOrderStatus: "SUFFICIENT",
    })),
    serviceItems: template.serviceItems.map<ServiceSnapshotRow>((item) => ({
      serviceId: item.serviceId,
      name: item.name,
      unitId: item.unitId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      notes: item.notes,
    })),
  }
}

function buildSyncPreview(args: {
  mode: "overwrite" | "append"
  existingMaterialItems: Array<{ productId: string; quantity: Prisma.Decimal; unitPrice: Prisma.Decimal; notes: string | null }>
  existingServiceItems: Array<{ serviceId: string | null; name: string; unitId: string; quantity: Prisma.Decimal; unitPrice: Prisma.Decimal; notes: string | null }>
  templateSnapshot: Awaited<ReturnType<typeof buildTemplateSyncSnapshot>>
}) {
  const existingMaterialKeys = new Set(args.existingMaterialItems.map(materialKey))
  const existingServiceKeys = new Set(args.existingServiceItems.map(serviceKey))

  const materialItemsToCreate =
    args.mode === "overwrite"
      ? args.templateSnapshot.items
      : args.templateSnapshot.items.filter((item) => !existingMaterialKeys.has(materialKey(item)))
  const serviceItemsToCreate =
    args.mode === "overwrite"
      ? args.templateSnapshot.serviceItems
      : args.templateSnapshot.serviceItems.filter((item) => !existingServiceKeys.has(serviceKey(item)))

  return {
    rowsToCreate: {
      materialItems: materialItemsToCreate.length,
      serviceItems: serviceItemsToCreate.length,
    },
    rowsToDelete: {
      materialItems: args.mode === "overwrite" ? args.existingMaterialItems.length : 0,
      serviceItems: args.mode === "overwrite" ? args.existingServiceItems.length : 0,
    },
    counts: {
      materialItems: args.mode === "overwrite" ? args.templateSnapshot.items.length : args.existingMaterialItems.length + materialItemsToCreate.length,
      serviceItems: args.mode === "overwrite" ? args.templateSnapshot.serviceItems.length : args.existingServiceItems.length + serviceItemsToCreate.length,
    },
    materialItemsToCreate,
    serviceItemsToCreate,
  }
}

export async function syncTemplateToWorkOrder(workOrderId: string, input: SyncTemplateToWorkOrderInput): Promise<SyncTemplateToWorkOrderResult> {
  const result = await prisma.$transaction(async (tx) => {
    const existingWorkOrder = await tx.flooringWorkOrder.findUniqueOrThrow({
      where: { id: workOrderId },
      select: {
        id: true,
        propertyId: true,
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

    const [templateSnapshot, existingMaterialItems, existingServiceItems] = await Promise.all([
      buildTemplateSyncSnapshot(input.templateId, tx),
      tx.flooringWorkOrderItem.findMany({
        where: { workOrderId },
        select: {
          productId: true,
          quantity: true,
          unitPrice: true,
          notes: true,
        },
      }),
      tx.flooringWorkOrderServiceItem.findMany({
        where: { workOrderId },
        select: {
          serviceId: true,
          name: true,
          unitId: true,
          quantity: true,
          unitPrice: true,
          notes: true,
        },
      }),
    ])

    if (existingWorkOrder.propertyId !== templateSnapshot.propertyId) {
      throw { message: "Template property must match the selected work order property", field: "templateId" }
    }

    const preview = buildSyncPreview({
      mode: input.mode,
      existingMaterialItems,
      existingServiceItems,
      templateSnapshot,
    })

    if (input.dryRun) {
      return {
        mode: input.mode,
        dryRun: true,
        workOrder: null,
        rowsToCreate: preview.rowsToCreate,
        rowsToDelete: preview.rowsToDelete,
        counts: preview.counts,
      }
    }

    if (input.mode === "overwrite") {
      await tx.flooringWorkOrderItem.deleteMany({ where: { workOrderId } })
      await tx.flooringWorkOrderServiceItem.deleteMany({ where: { workOrderId } })
    }

    if (preview.materialItemsToCreate.length > 0) {
      await tx.flooringWorkOrderItem.createMany({
        data: preview.materialItemsToCreate.map((item) => ({
          workOrderId,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          notes: item.notes,
          changeOrderStatus: item.changeOrderStatus,
        })),
      })
    }

    if (preview.serviceItemsToCreate.length > 0) {
      await tx.flooringWorkOrderServiceItem.createMany({
        data: preview.serviceItemsToCreate.map((item) => ({
          workOrderId,
          serviceId: item.serviceId,
          name: item.name,
          unitId: item.unitId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          notes: item.notes,
        })),
      })
    }

    await tx.flooringWorkOrder.update({
      where: { id: workOrderId },
      data: { templateId: input.templateId },
    })

    return {
      mode: input.mode,
      dryRun: false,
      workOrder: await getWorkOrderById(workOrderId),
      rowsToCreate: preview.rowsToCreate,
      rowsToDelete: preview.rowsToDelete,
      counts: preview.counts,
    }
  })

  return result
}
