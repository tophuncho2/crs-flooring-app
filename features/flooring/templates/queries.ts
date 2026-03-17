import { prisma } from "@/server/db/prisma"
import { normalizeTemplate, normalizeTemplateItem, normalizeTemplateServiceItem } from "./services"

export async function listTemplates() {
  const templates = await prisma.flooringTemplate.findMany({
    include: {
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
    },
    orderBy: { createdAt: "desc" },
    take: 250,
  })

  return templates.map(normalizeTemplate)
}

export async function getTemplateById(id: string) {
  const template = await prisma.flooringTemplate.findUniqueOrThrow({
    where: { id },
    include: {
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
    },
  })

  return normalizeTemplate(template)
}

export async function listTemplateItems(templateId: string) {
  const items = await prisma.flooringTemplateItem.findMany({
    where: { templateId },
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
    orderBy: { createdAt: "desc" },
  })

  return items.map(normalizeTemplateItem)
}

export async function listTemplateServiceItems(templateId: string) {
  const items = await prisma.flooringTemplateServiceItem.findMany({
    where: { templateId },
    include: {
      unit: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return items.map(normalizeTemplateServiceItem)
}
