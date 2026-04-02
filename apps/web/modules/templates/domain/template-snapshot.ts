import { createHash } from "crypto"
import type {
  TemplateSnapshot,
  TemplateSnapshotMaterialRow,
  TemplateSnapshotServiceRow,
  TemplateSnapshotSalesRepRow,
} from "@/modules/templates/data/template-snapshot-queries"

export type { TemplateSnapshot, TemplateSnapshotMaterialRow, TemplateSnapshotServiceRow, TemplateSnapshotSalesRepRow }

type DecimalLike = { toString(): string }

type ExistingWorkOrderMaterialRow = {
  id: string
  sourceTemplateItemId: string | null
  productId: string
  quantity: DecimalLike
  unitPrice: DecimalLike
  notes: string | null
  changeOrderStatus: "SUFFICIENT" | "SHORTAGE" | null
}

type ExistingWorkOrderServiceRow = {
  id: string
  sourceTemplateServiceItemId: string | null
  serviceId: string | null
  name: string
  unitId: string
  quantity: DecimalLike
  unitPrice: DecimalLike
  notes: string | null
}

type ExistingWorkOrderSalesRepRow = {
  id: string
  sourceTemplateSalesRepId: string | null
  contactId: string
  percent: DecimalLike
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

export function buildSnapshotHash(snapshot: Omit<TemplateSnapshot, "hash">) {
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

export function buildSyncPlan(args: {
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
