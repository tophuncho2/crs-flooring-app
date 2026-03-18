import { prisma } from "@/server/db/prisma"
import { listServiceOptions } from "@/features/flooring/services/queries"
import { buildProductName } from "@/features/flooring/products/services"
import { normalizeTemplate, normalizeTemplateItem, normalizeTemplateServiceItem, normalizeTemplateSummary } from "./services"

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
      items: {
        orderBy: { createdAt: "desc" },
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
      },
      serviceItems: {
        orderBy: { createdAt: "desc" },
        include: {
          unit: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  })

  return {
    ...(() => {
      const normalizedItems = template.items.map(normalizeTemplateItem)
      const normalizedServiceItems = template.serviceItems.map(normalizeTemplateServiceItem)

      return {
        ...normalizeTemplate(template),
        items: normalizedItems,
        serviceItems: normalizedServiceItems,
        summary: normalizeTemplateSummary({
          items: normalizedItems,
          serviceItems: normalizedServiceItems,
        }),
      }
    })(),
  }
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

function buildPadLabel(product: {
  manufacturerName: string | null
  style: string | null
  color: string | null
}) {
  return buildProductName(product).replace("Flooring Product", "Pad Product")
}

export async function getTemplatesPageData() {
  const [initialTemplates, properties, warehouses, padProducts, products, services, units] = await Promise.all([
    listTemplates(),
    prisma.property.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.flooringWarehouse.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.flooringProduct.findMany({
      where: {
        category: {
          name: "Pad",
        },
      },
      orderBy: [{ manufacturerName: "asc" }, { style: "asc" }, { color: "asc" }],
      select: {
        id: true,
        manufacturerName: true,
        style: true,
        color: true,
      },
    }),
    prisma.flooringProduct.findMany({
      orderBy: [{ manufacturerName: "asc" }, { style: "asc" }, { color: "asc" }],
      select: {
        id: true,
        manufacturerName: true,
        style: true,
        color: true,
        category: {
          select: { sendUnit: { select: { name: true } } },
        },
      },
    }),
    listServiceOptions(),
    prisma.flooringUnitOfMeasure.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ])

  return {
    initialTemplates,
    propertyOptions: properties,
    warehouseOptions: warehouses,
    padProductOptions: padProducts.map((product) => ({
      id: product.id,
      label: buildPadLabel(product),
    })),
    productOptions: products.map((product) => ({
      id: product.id,
      label: buildProductName(product),
      sendUnit: product.category.sendUnit?.name ?? "",
    })),
    serviceOptions: services,
    unitOptions: units,
  }
}
