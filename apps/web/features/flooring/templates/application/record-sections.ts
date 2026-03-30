import { Prisma, prisma } from "@builders/db"
import { createAppError } from "@/server/http/api-helpers"
import { getTemplateById } from "../queries"
import type {
  TemplateMaterialItemInput,
  TemplateServiceItemInput,
  UpdateTemplateInput,
  UpdateTemplateMaterialItemsSectionInput,
  UpdateTemplateSalesRepsSectionInput,
  UpdateTemplateServiceItemsSectionInput,
} from "../validators"

async function ensurePadProduct(productId: string | null, tx: Prisma.TransactionClient | typeof prisma = prisma) {
  if (!productId) {
    return null
  }

  const product = await tx.flooringProduct.findFirst({
    where: {
      id: productId,
      category: {
        name: "Pad",
      },
    },
    select: { id: true },
  })

  if (!product) {
    throw { message: "padProductId must reference a Pad product", field: "padProductId" }
  }

  return product.id
}

async function resolveMaterialUnitPrice(
  item: TemplateMaterialItemInput,
  tx: Prisma.TransactionClient | typeof prisma = prisma,
) {
  if (item.unitPrice) {
    return item.unitPrice
  }

  const product = await tx.flooringProduct.findUnique({
    where: { id: item.productId },
    select: { cost: true },
  })

  return product?.cost ?? "0"
}

async function resolveServiceNameAndPrice(
  item: TemplateServiceItemInput,
  tx: Prisma.TransactionClient | typeof prisma = prisma,
) {
  if (!item.serviceId) {
    return {
      name: item.name ?? "Custom Service",
      unitPrice: item.unitPrice ?? "0",
    }
  }

  const service = await tx.flooringService.findUniqueOrThrow({
    where: { id: item.serviceId },
    select: { name: true, baseCost: true },
  })

  return {
    name: item.name ?? service.name,
    unitPrice: item.unitPrice ?? service.baseCost,
  }
}

async function resolveSalesRepContact(input: { contactId: string }, tx: Prisma.TransactionClient | typeof prisma = prisma) {
  const contact = await tx.flooringContact.findUniqueOrThrow({
    where: { id: input.contactId },
    select: {
      id: true,
      name: true,
      type: true,
    },
  })

  if (contact.type !== "SALES_REP") {
    throw createAppError("Selected contact must be a Sales Rep", { field: "contactId" })
  }

  return contact
}

async function ensureUniqueTemplateSalesRep(
  templateId: string,
  contactId: string,
  tx: Prisma.TransactionClient,
  excludeRepId?: string,
) {
  const existing = await tx.flooringTemplateSalesRep.findFirst({
    where: {
      templateId,
      contactId,
      ...(excludeRepId ? { id: { not: excludeRepId } } : {}),
    },
    select: { id: true },
  })

  if (existing) {
    throw createAppError("This sales rep is already assigned to the template", {
      status: 409,
      field: "contactId",
    })
  }
}

function assertVersionMatch(actualUpdatedAt: Date, expectedUpdatedAt: string, message: string) {
  if (actualUpdatedAt.toISOString() !== expectedUpdatedAt) {
    throw createAppError(message, {
      status: 409,
      field: "updatedAt",
    })
  }
}

async function touchTemplate(templateId: string, tx: Prisma.TransactionClient) {
  await tx.flooringTemplate.update({
    where: { id: templateId },
    data: {
      updatedAt: new Date(),
    },
  })
}

export async function updateTemplatePrimarySectionUseCase(id: string, input: UpdateTemplateInput) {
  await prisma.flooringTemplate.update({
    where: { id },
    data: {
      ...input,
      ...(input.padProductId !== undefined ? { padProductId: await ensurePadProduct(input.padProductId, prisma) } : {}),
    },
  })

  return getTemplateById(id)
}

export async function deleteTemplateRecordUseCase(id: string) {
  await prisma.$transaction(async (tx) => {
    await tx.flooringTemplateSalesRep.deleteMany({ where: { templateId: id } })
    await tx.flooringTemplateServiceItem.deleteMany({ where: { templateId: id } })
    await tx.flooringTemplateItem.deleteMany({ where: { templateId: id } })
    await tx.flooringTemplate.delete({ where: { id } })
  })

  return { ok: true as const }
}

export async function saveTemplateMaterialItemsSectionUseCase(
  templateId: string,
  input: UpdateTemplateMaterialItemsSectionInput,
) {
  await prisma.$transaction(async (tx) => {
    const currentItems = await tx.flooringTemplateItem.findMany({
      where: { templateId },
      select: {
        id: true,
        productId: true,
        quantity: true,
        unitPrice: true,
        notes: true,
        createdAt: true,
      },
    })
    const currentItemsById = new Map(currentItems.map((item) => [item.id, item]))
    const seenItemIds = new Set<string>()
    let didChange = currentItems.length !== input.items.length

    for (const row of input.items) {
      const nextUnitPrice = await resolveMaterialUnitPrice(row.item, tx)

      if (!row.id) {
        await tx.flooringTemplateItem.create({
          data: {
            templateId,
            productId: row.item.productId,
            quantity: row.item.quantity,
            unitPrice: nextUnitPrice,
            notes: row.item.notes,
          },
        })
        didChange = true
        continue
      }

      const current = currentItemsById.get(row.id)
      if (!current) {
        throw createAppError("Material item does not belong to this template", {
          status: 404,
          field: "id",
        })
      }

      assertVersionMatch(current.createdAt, row.expectedUpdatedAt ?? "", "Material item changed before save completed. Refresh and try again.")

      const nextNotes = row.item.notes || null
      const isUnchanged =
        current.productId === row.item.productId &&
        String(current.quantity) === String(row.item.quantity) &&
        String(current.unitPrice) === String(nextUnitPrice) &&
        (current.notes ?? null) === nextNotes

      seenItemIds.add(row.id)
      if (isUnchanged) {
        continue
      }

      await tx.flooringTemplateItem.update({
        where: { id: row.id },
        data: {
          productId: row.item.productId,
          quantity: row.item.quantity,
          unitPrice: nextUnitPrice,
          notes: nextNotes,
        },
      })
      didChange = true
    }

    for (const current of currentItems) {
      if (seenItemIds.has(current.id)) {
        continue
      }

      await tx.flooringTemplateItem.delete({ where: { id: current.id } })
      didChange = true
    }

    if (didChange) {
      await touchTemplate(templateId, tx)
    }
  })
}

export async function saveTemplateServiceItemsSectionUseCase(
  templateId: string,
  input: UpdateTemplateServiceItemsSectionInput,
) {
  await prisma.$transaction(async (tx) => {
    const currentItems = await tx.flooringTemplateServiceItem.findMany({
      where: { templateId },
      select: {
        id: true,
        serviceId: true,
        name: true,
        unitId: true,
        quantity: true,
        unitPrice: true,
        notes: true,
        createdAt: true,
      },
    })
    const currentItemsById = new Map(currentItems.map((item) => [item.id, item]))
    const seenItemIds = new Set<string>()
    let didChange = currentItems.length !== input.items.length

    for (const row of input.items) {
      const resolved = await resolveServiceNameAndPrice(row.item, tx)

      if (!row.id) {
        await tx.flooringTemplateServiceItem.create({
          data: {
            templateId,
            serviceId: row.item.serviceId,
            name: resolved.name,
            unitId: row.item.unitId,
            quantity: row.item.quantity,
            unitPrice: resolved.unitPrice,
            notes: row.item.notes,
          },
        })
        didChange = true
        continue
      }

      const current = currentItemsById.get(row.id)
      if (!current) {
        throw createAppError("Service item does not belong to this template", {
          status: 404,
          field: "id",
        })
      }

      assertVersionMatch(current.createdAt, row.expectedUpdatedAt ?? "", "Service item changed before save completed. Refresh and try again.")

      const nextServiceId = row.item.serviceId || null
      const nextNotes = row.item.notes || null
      const isUnchanged =
        current.serviceId === nextServiceId &&
        current.name === resolved.name &&
        current.unitId === row.item.unitId &&
        String(current.quantity) === String(row.item.quantity) &&
        String(current.unitPrice) === String(resolved.unitPrice) &&
        (current.notes ?? null) === nextNotes

      seenItemIds.add(row.id)
      if (isUnchanged) {
        continue
      }

      await tx.flooringTemplateServiceItem.update({
        where: { id: row.id },
        data: {
          serviceId: nextServiceId,
          name: resolved.name,
          unitId: row.item.unitId,
          quantity: row.item.quantity,
          unitPrice: resolved.unitPrice,
          notes: nextNotes,
        },
      })
      didChange = true
    }

    for (const current of currentItems) {
      if (seenItemIds.has(current.id)) {
        continue
      }

      await tx.flooringTemplateServiceItem.delete({ where: { id: current.id } })
      didChange = true
    }

    if (didChange) {
      await touchTemplate(templateId, tx)
    }
  })
}

export async function saveTemplateSalesRepsSectionUseCase(
  templateId: string,
  input: UpdateTemplateSalesRepsSectionInput,
) {
  await prisma.$transaction(async (tx) => {
    const currentItems = await tx.flooringTemplateSalesRep.findMany({
      where: { templateId },
      select: {
        id: true,
        contactId: true,
        percent: true,
        createdAt: true,
      },
    })
    const currentItemsById = new Map(currentItems.map((item) => [item.id, item]))
    const seenItemIds = new Set<string>()
    const seenContactIds = new Set<string>()
    let didChange = currentItems.length !== input.items.length

    for (const row of input.items) {
      if (seenContactIds.has(row.item.contactId)) {
        throw createAppError("Each sales rep can only appear once in the section", {
          status: 409,
          field: "contactId",
        })
      }
      seenContactIds.add(row.item.contactId)

      const contact = await resolveSalesRepContact(row.item, tx)

      if (!row.id) {
        await ensureUniqueTemplateSalesRep(templateId, contact.id, tx)
        await tx.flooringTemplateSalesRep.create({
          data: {
            templateId,
            contactId: contact.id,
            percent: row.item.percent,
          },
        })
        didChange = true
        continue
      }

      const current = currentItemsById.get(row.id)
      if (!current) {
        throw createAppError("Sales rep row does not belong to this template", {
          status: 404,
          field: "id",
        })
      }

      assertVersionMatch(current.createdAt, row.expectedUpdatedAt ?? "", "Sales rep changed before save completed. Refresh and try again.")
      await ensureUniqueTemplateSalesRep(templateId, contact.id, tx, row.id)

      seenItemIds.add(row.id)
      if (current.contactId === contact.id && String(current.percent) === String(row.item.percent)) {
        continue
      }

      await tx.flooringTemplateSalesRep.update({
        where: { id: row.id },
        data: {
          contactId: contact.id,
          percent: row.item.percent,
        },
      })
      didChange = true
    }

    for (const current of currentItems) {
      if (seenItemIds.has(current.id)) {
        continue
      }

      await tx.flooringTemplateSalesRep.delete({ where: { id: current.id } })
      didChange = true
    }

    if (didChange) {
      await touchTemplate(templateId, tx)
    }
  })
}
