import { Prisma } from "@builders/db"
import { buildSnapshotHash } from "@/modules/templates/domain/template-snapshot"

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
