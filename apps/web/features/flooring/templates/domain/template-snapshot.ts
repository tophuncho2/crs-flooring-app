import { createHash } from "crypto"
import { Prisma } from "@builders/db"
import { buildInvoiceInvalidationFields } from "@/features/flooring/work-orders/invoice-state"

export type TemplateSnapshotMaterialRow = {
  sourceTemplateItemId: string
  productId: string
  quantity: Prisma.Decimal
  unitPrice: Prisma.Decimal
  notes: string | null
  changeOrderStatus: "SUFFICIENT"
}

export type TemplateSnapshotServiceRow = {
  sourceTemplateServiceItemId: string
  serviceId: string | null
  name: string
  unitId: string
  quantity: Prisma.Decimal
  unitPrice: Prisma.Decimal
  notes: string | null
}

export type TemplateSnapshotSalesRepRow = {
  sourceTemplateSalesRepId: string
  contactId: string
  percent: Prisma.Decimal
}

export type TemplateSnapshot = {
  templateId: string
  propertyId: string
  warehouseId: string | null
  unitType: string | null
  instructions: string | null
  hash: string
  items: TemplateSnapshotMaterialRow[]
  serviceItems: TemplateSnapshotServiceRow[]
  salesReps: TemplateSnapshotSalesRepRow[]
}

type ExistingWorkOrderMaterialRow = {
  id: string
  sourceTemplateItemId: string | null
  productId: string
  quantity: Prisma.Decimal
  unitPrice: Prisma.Decimal
  notes: string | null
  changeOrderStatus: "SUFFICIENT" | "SHORTAGE" | null
}

type ExistingWorkOrderServiceRow = {
  id: string
  sourceTemplateServiceItemId: string | null
  serviceId: string | null
  name: string
  unitId: string
  quantity: Prisma.Decimal
  unitPrice: Prisma.Decimal
  notes: string | null
}

type ExistingWorkOrderSalesRepRow = {
  id: string
  sourceTemplateSalesRepId: string | null
  contactId: string
  percent: Prisma.Decimal
}

type ExistingWorkOrderHeader = {
  templateId: string | null
  warehouseId: string | null
  unitType: string | null
  instructions: string | null
}

export type TemplateSyncPreview = {
  headerUpdates: {
    warehouseId: boolean
    unitType: boolean
    instructions: boolean
    templateId: boolean
  }
  rowsToCreate: {
    materialItems: number
    serviceItems: number
    salesReps: number
  }
  rowsToDelete: {
    materialItems: number
    serviceItems: number
    salesReps: number
  }
  counts: {
    materialItems: number
    serviceItems: number
    salesReps: number
  }
}

export type TemplateSyncApplyResult = TemplateSyncPreview & {
  templateId: string
  templateSnapshotHash: string
}

type SyncPlan = TemplateSyncPreview & {
  materialItemsToCreate: TemplateSnapshotMaterialRow[]
  serviceItemsToCreate: TemplateSnapshotServiceRow[]
  salesRepsToCreate: TemplateSnapshotSalesRepRow[]
  materialItemsToUpdate: Array<{ existingId: string; snapshot: TemplateSnapshotMaterialRow }>
  serviceItemsToUpdate: Array<{ existingId: string; snapshot: TemplateSnapshotServiceRow }>
  salesRepsToUpdate: Array<{ existingId: string; snapshot: TemplateSnapshotSalesRepRow }>
  materialItemIdsToDelete: string[]
  serviceItemIdsToDelete: string[]
  salesRepIdsToDelete: string[]
}

function buildSnapshotHash(snapshot: Omit<TemplateSnapshot, "hash">) {
  const payload = JSON.stringify({
    templateId: snapshot.templateId,
    propertyId: snapshot.propertyId,
    warehouseId: snapshot.warehouseId,
    unitType: snapshot.unitType ?? "",
    instructions: snapshot.instructions ?? "",
    items: snapshot.items.map((item) => ({
      sourceTemplateItemId: item.sourceTemplateItemId,
      productId: item.productId,
      quantity: item.quantity.toString(),
      unitPrice: item.unitPrice.toString(),
      notes: item.notes ?? "",
    })),
    serviceItems: snapshot.serviceItems.map((item) => ({
      sourceTemplateServiceItemId: item.sourceTemplateServiceItemId,
      serviceId: item.serviceId ?? "",
      name: item.name,
      unitId: item.unitId,
      quantity: item.quantity.toString(),
      unitPrice: item.unitPrice.toString(),
      notes: item.notes ?? "",
    })),
    salesReps: snapshot.salesReps.map((item) => ({
      sourceTemplateSalesRepId: item.sourceTemplateSalesRepId,
      contactId: item.contactId,
      percent: item.percent.toString(),
    })),
  })

  return createHash("sha256").update(payload).digest("hex")
}

export async function loadTemplateSnapshot(templateId: string, tx: Prisma.TransactionClient): Promise<TemplateSnapshot> {
  const template = await tx.flooringTemplate.findUniqueOrThrow({
    where: { id: templateId },
    select: {
      id: true,
      propertyId: true,
      templateTag: true,
      warehouseId: true,
      instructions: true,
      items: {
        select: {
          id: true,
          productId: true,
          quantity: true,
          unitPrice: true,
          notes: true,
        },
      },
      serviceItems: {
        select: {
          id: true,
          serviceId: true,
          name: true,
          unitId: true,
          quantity: true,
          unitPrice: true,
          notes: true,
        },
      },
      salesReps: {
        select: {
          id: true,
          contactId: true,
          percent: true,
        },
      },
    },
  })

  const snapshotWithoutHash = {
    templateId: template.id,
    propertyId: template.propertyId,
    warehouseId: template.warehouseId,
    unitType: template.templateTag,
    instructions: template.instructions,
    items: (template.items ?? []).map<TemplateSnapshotMaterialRow>((item) => ({
      sourceTemplateItemId: item.id,
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      notes: item.notes,
      changeOrderStatus: "SUFFICIENT",
    })),
    serviceItems: (template.serviceItems ?? []).map<TemplateSnapshotServiceRow>((item) => ({
      sourceTemplateServiceItemId: item.id,
      serviceId: item.serviceId,
      name: item.name,
      unitId: item.unitId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      notes: item.notes,
    })),
    salesReps: (template.salesReps ?? []).map<TemplateSnapshotSalesRepRow>((item) => ({
      sourceTemplateSalesRepId: item.id,
      contactId: item.contactId,
      percent: item.percent,
    })),
  } satisfies Omit<TemplateSnapshot, "hash">

  return {
    ...snapshotWithoutHash,
    hash: buildSnapshotHash(snapshotWithoutHash),
  }
}

function buildSyncPlan(args: {
  mode: "overwrite" | "append"
  existingWorkOrder: ExistingWorkOrderHeader
  existingMaterialItems: ExistingWorkOrderMaterialRow[]
  existingServiceItems: ExistingWorkOrderServiceRow[]
  existingSalesReps: ExistingWorkOrderSalesRepRow[]
  snapshot: TemplateSnapshot
}): SyncPlan {
  const existingMaterialBySource = new Map(
    args.existingMaterialItems
      .filter((item): item is ExistingWorkOrderMaterialRow & { sourceTemplateItemId: string } => Boolean(item.sourceTemplateItemId))
      .map((item) => [item.sourceTemplateItemId, item]),
  )
  const existingServiceBySource = new Map(
    args.existingServiceItems
      .filter((item): item is ExistingWorkOrderServiceRow & { sourceTemplateServiceItemId: string } => Boolean(item.sourceTemplateServiceItemId))
      .map((item) => [item.sourceTemplateServiceItemId, item]),
  )
  const existingSalesRepBySource = new Map(
    args.existingSalesReps
      .filter((item): item is ExistingWorkOrderSalesRepRow & { sourceTemplateSalesRepId: string } => Boolean(item.sourceTemplateSalesRepId))
      .map((item) => [item.sourceTemplateSalesRepId, item]),
  )
  const existingSalesRepByContact = new Map(args.existingSalesReps.map((item) => [item.contactId, item]))

  const snapshotMaterialSourceIds = new Set(args.snapshot.items.map((item) => item.sourceTemplateItemId))
  const snapshotServiceSourceIds = new Set(args.snapshot.serviceItems.map((item) => item.sourceTemplateServiceItemId))
  const snapshotSalesRepSourceIds = new Set(args.snapshot.salesReps.map((item) => item.sourceTemplateSalesRepId))

  const materialItemsToCreate = args.snapshot.items.filter((item) => !existingMaterialBySource.has(item.sourceTemplateItemId))
  const serviceItemsToCreate = args.snapshot.serviceItems.filter((item) => !existingServiceBySource.has(item.sourceTemplateServiceItemId))
  const salesRepsToCreate = args.snapshot.salesReps.filter(
    (item) => !existingSalesRepBySource.has(item.sourceTemplateSalesRepId) && !existingSalesRepByContact.has(item.contactId),
  )

  const materialItemsToUpdate =
    args.mode === "overwrite"
      ? args.snapshot.items.flatMap((item) => {
          const existing = existingMaterialBySource.get(item.sourceTemplateItemId)
          return existing ? [{ existingId: existing.id, snapshot: item }] : []
        })
      : []
  const serviceItemsToUpdate =
    args.mode === "overwrite"
      ? args.snapshot.serviceItems.flatMap((item) => {
          const existing = existingServiceBySource.get(item.sourceTemplateServiceItemId)
          return existing ? [{ existingId: existing.id, snapshot: item }] : []
        })
      : []
  const salesRepsToUpdate =
    args.mode === "overwrite"
      ? args.snapshot.salesReps.flatMap((item) => {
          const existing = existingSalesRepBySource.get(item.sourceTemplateSalesRepId) ?? existingSalesRepByContact.get(item.contactId)
          return existing ? [{ existingId: existing.id, snapshot: item }] : []
        })
      : []

  const materialItemIdsToDelete =
    args.mode === "overwrite"
      ? args.existingMaterialItems
          .filter((item) => item.sourceTemplateItemId && !snapshotMaterialSourceIds.has(item.sourceTemplateItemId))
          .map((item) => item.id)
      : []
  const serviceItemIdsToDelete =
    args.mode === "overwrite"
      ? args.existingServiceItems
          .filter((item) => item.sourceTemplateServiceItemId && !snapshotServiceSourceIds.has(item.sourceTemplateServiceItemId))
          .map((item) => item.id)
      : []
  const salesRepIdsToDelete =
    args.mode === "overwrite"
      ? args.existingSalesReps
          .filter((item) => item.sourceTemplateSalesRepId && !snapshotSalesRepSourceIds.has(item.sourceTemplateSalesRepId))
          .map((item) => item.id)
      : []

  const manualMaterialCount = args.existingMaterialItems.filter((item) => !item.sourceTemplateItemId).length
  const manualServiceCount = args.existingServiceItems.filter((item) => !item.sourceTemplateServiceItemId).length
  const manualSalesRepCount = args.existingSalesReps.filter((item) => !item.sourceTemplateSalesRepId).length

  return {
    headerUpdates: {
      warehouseId: args.existingWorkOrder.warehouseId !== args.snapshot.warehouseId,
      unitType: (args.existingWorkOrder.unitType ?? "") !== (args.snapshot.unitType ?? ""),
      instructions: (args.existingWorkOrder.instructions ?? "") !== (args.snapshot.instructions ?? ""),
      templateId: true,
    },
    rowsToCreate: {
      materialItems: materialItemsToCreate.length,
      serviceItems: serviceItemsToCreate.length,
      salesReps: salesRepsToCreate.length,
    },
    rowsToDelete: {
      materialItems: materialItemIdsToDelete.length,
      serviceItems: serviceItemIdsToDelete.length,
      salesReps: salesRepIdsToDelete.length,
    },
    counts: {
      materialItems:
        args.mode === "overwrite"
          ? manualMaterialCount + args.snapshot.items.length
          : args.existingMaterialItems.length + materialItemsToCreate.length,
      serviceItems:
        args.mode === "overwrite"
          ? manualServiceCount + args.snapshot.serviceItems.length
          : args.existingServiceItems.length + serviceItemsToCreate.length,
      salesReps:
        args.mode === "overwrite"
          ? manualSalesRepCount + args.snapshot.salesReps.length
          : args.existingSalesReps.length + salesRepsToCreate.length,
    },
    materialItemsToCreate,
    serviceItemsToCreate,
    salesRepsToCreate,
    materialItemsToUpdate,
    serviceItemsToUpdate,
    salesRepsToUpdate,
    materialItemIdsToDelete,
    serviceItemIdsToDelete,
    salesRepIdsToDelete,
  }
}

export function previewTemplateSync(args: {
  mode: "overwrite" | "append"
  existingWorkOrder: ExistingWorkOrderHeader
  existingMaterialItems: ExistingWorkOrderMaterialRow[]
  existingServiceItems: ExistingWorkOrderServiceRow[]
  existingSalesReps: ExistingWorkOrderSalesRepRow[]
  snapshot: TemplateSnapshot
}): TemplateSyncPreview {
  const plan = buildSyncPlan(args)

  return {
    headerUpdates: plan.headerUpdates,
    rowsToCreate: plan.rowsToCreate,
    rowsToDelete: plan.rowsToDelete,
    counts: plan.counts,
  }
}

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
  existingWorkOrder: ExistingWorkOrderHeader
  existingMaterialItems: ExistingWorkOrderMaterialRow[]
  existingServiceItems: ExistingWorkOrderServiceRow[]
  existingSalesReps: ExistingWorkOrderSalesRepRow[]
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
      ...buildInvoiceInvalidationFields(),
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
