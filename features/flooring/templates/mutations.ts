import { prisma } from "@/server/db/prisma"
import { normalizeTemplate, normalizeTemplateItem, normalizeTemplateServiceItem } from "./services"
import type {
  CreateTemplateInput,
  TemplateMaterialItemInput,
  TemplateServiceItemInput,
  UpdateTemplateInput,
} from "./validators"

const templateInclude = {
  property: {
    select: { id: true, name: true },
  },
  warehouse: {
    select: { id: true, name: true },
  },
  padProduct: {
    select: {
      id: true,
      manufacturerName: true,
      style: true,
      color: true,
    },
  },
  _count: {
    select: { items: true, serviceItems: true },
  },
} as const

async function ensurePadProduct(productId: string | null) {
  if (!productId) {
    return null
  }

  const product = await prisma.flooringProduct.findFirst({
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

async function resolveMaterialUnitPrice(item: TemplateMaterialItemInput) {
  if (item.unitPrice) {
    return item.unitPrice
  }

  const product = await prisma.flooringProduct.findUnique({
    where: { id: item.productId },
    select: { cost: true },
  })

  return product?.cost ?? "0"
}

async function resolveServiceNameAndPrice(item: TemplateServiceItemInput) {
  if (!item.serviceId) {
    return {
      name: item.name ?? "Custom Service",
      unitPrice: item.unitPrice ?? "0",
    }
  }

  const service = await prisma.flooringService.findUniqueOrThrow({
    where: { id: item.serviceId },
    select: { name: true, baseCost: true },
  })

  return {
    name: item.name ?? service.name,
    unitPrice: item.unitPrice ?? service.baseCost,
  }
}

export async function createTemplate(input: CreateTemplateInput) {
  const padProductId = await ensurePadProduct(input.padProductId)

  const template = await prisma.$transaction(async (tx) => {
    const created = await tx.flooringTemplate.create({
      data: {
        propertyId: input.propertyId,
        templateTag: input.templateTag,
        warehouseId: input.warehouseId,
        instructions: input.instructions,
        templateNotes: input.templateNotes,
        padProductId,
      },
      include: templateInclude,
    })

    for (const item of input.items) {
      await tx.flooringTemplateItem.create({
        data: {
          templateId: created.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: await resolveMaterialUnitPrice(item),
          notes: item.notes,
          storedDyeLot: item.storedDyeLot,
        },
      })
    }

    for (const item of input.serviceItems) {
      const resolved = await resolveServiceNameAndPrice(item)
      await tx.flooringTemplateServiceItem.create({
        data: {
          templateId: created.id,
          serviceId: item.serviceId,
          name: resolved.name,
          unitId: item.unitId,
          quantity: item.quantity,
          unitPrice: resolved.unitPrice,
          notes: item.notes,
        },
      })
    }

    return tx.flooringTemplate.findUniqueOrThrow({
      where: { id: created.id },
      include: templateInclude,
    })
  })

  return normalizeTemplate(template)
}

export async function updateTemplate(id: string, input: UpdateTemplateInput) {
  const template = await prisma.flooringTemplate.update({
    where: { id },
    data: {
      ...input,
      ...(input.padProductId !== undefined ? { padProductId: await ensurePadProduct(input.padProductId) } : {}),
    },
    include: templateInclude,
  })

  return normalizeTemplate(template)
}

export async function deleteTemplate(id: string) {
  await prisma.flooringTemplate.delete({ where: { id } })
}

export async function createTemplateItem(templateId: string, input: TemplateMaterialItemInput) {
  const created = await prisma.flooringTemplateItem.create({
    data: {
      templateId,
      productId: input.productId,
      quantity: input.quantity,
      unitPrice: await resolveMaterialUnitPrice(input),
      notes: input.notes,
      storedDyeLot: input.storedDyeLot,
    },
    include: {
      product: {
        select: {
          manufacturerName: true,
          style: true,
          color: true,
          category: { select: { sendUnit: { select: { name: true } } } },
        },
      },
    },
  })

  return normalizeTemplateItem(created)
}

export async function updateTemplateItem(itemId: string, input: Partial<TemplateMaterialItemInput>) {
  const updated = await prisma.flooringTemplateItem.update({
    where: { id: itemId },
    data: {
      productId: input.productId,
      quantity: input.quantity,
      unitPrice: input.unitPrice ?? undefined,
      notes: input.notes,
      storedDyeLot: input.storedDyeLot,
    },
    include: {
      product: {
        select: {
          manufacturerName: true,
          style: true,
          color: true,
          category: { select: { sendUnit: { select: { name: true } } } },
        },
      },
    },
  })

  return normalizeTemplateItem(updated)
}

export async function deleteTemplateItem(itemId: string) {
  await prisma.flooringTemplateItem.delete({ where: { id: itemId } })
}

export async function createTemplateServiceItem(templateId: string, input: TemplateServiceItemInput) {
  const resolved = await resolveServiceNameAndPrice(input)
  const created = await prisma.flooringTemplateServiceItem.create({
    data: {
      templateId,
      serviceId: input.serviceId,
      name: resolved.name,
      unitId: input.unitId,
      quantity: input.quantity,
      unitPrice: resolved.unitPrice,
      notes: input.notes,
    },
    include: {
      unit: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })

  return normalizeTemplateServiceItem(created)
}

export async function updateTemplateServiceItem(itemId: string, input: Partial<TemplateServiceItemInput>) {
  const service = input.serviceId
    ? await prisma.flooringService.findUnique({
        where: { id: input.serviceId },
        select: { name: true, baseCost: true },
      })
    : null

  const updated = await prisma.flooringTemplateServiceItem.update({
    where: { id: itemId },
    data: {
      serviceId: input.serviceId,
      name: input.name ?? service?.name,
      unitId: input.unitId,
      quantity: input.quantity,
      unitPrice: input.unitPrice ?? service?.baseCost ?? undefined,
      notes: input.notes,
    },
    include: {
      unit: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })

  return normalizeTemplateServiceItem(updated)
}

export async function deleteTemplateServiceItem(itemId: string) {
  await prisma.flooringTemplateServiceItem.delete({ where: { id: itemId } })
}
