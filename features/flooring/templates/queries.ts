import { Prisma } from "@prisma/client"
import { prisma } from "@/server/db/prisma"
import { createPrismaPageLoadIssue, isPrismaNotFoundError, withPrismaConnectivityHandling, type PrismaDetailPageResult } from "@/server/db/prisma-errors"
import { appendUniqueOrderBy, createServerPagination, type ServerTableQueryState } from "@/server/pagination"
import { buildProductName } from "@/features/flooring/products/services"
import { loadTemplateRecordDetailOptions } from "@/features/flooring/shared/record-page/record-detail-options"
import { normalizeTemplate, normalizeTemplateItem, normalizeTemplateServiceItem, normalizeTemplateSummary } from "./services"

function buildTemplatesWhere(searchQuery: string): Prisma.FlooringTemplateWhereInput | undefined {
  if (!searchQuery) return undefined

  return {
    OR: [
      { templateNumber: { contains: searchQuery, mode: "insensitive" } },
      { templateTag: { contains: searchQuery, mode: "insensitive" } },
      { property: { name: { contains: searchQuery, mode: "insensitive" } } },
      { warehouse: { name: { contains: searchQuery, mode: "insensitive" } } },
      { instructions: { contains: searchQuery, mode: "insensitive" } },
      { templateNotes: { contains: searchQuery, mode: "insensitive" } },
    ],
  }
}

function buildTemplatesOrderBy(tableState: ServerTableQueryState): Prisma.FlooringTemplateOrderByWithRelationInput[] {
  const direction: Prisma.SortOrder = tableState.isAscendingSort ? "asc" : "desc"
  const orderBy: Prisma.FlooringTemplateOrderByWithRelationInput[] = []
  const fieldMap: Record<string, Prisma.FlooringTemplateOrderByWithRelationInput> = {
    templateNumber: { templateNumber: direction },
    templateTag: { templateTag: direction },
    property: { property: { name: direction } },
    warehouse: { warehouse: { name: direction } },
    instructions: { instructions: direction },
    padType: { padProduct: { style: direction } },
    templateNotes: { templateNotes: direction },
  }

  if (tableState.isGroupingEnabled) {
    for (const groupKey of tableState.groupByKeys) {
      appendUniqueOrderBy(orderBy, fieldMap[groupKey])
    }
  }

  appendUniqueOrderBy(orderBy, { templateNumber: direction })

  return orderBy
}

export async function listTemplates(
  pagination: { skip: number; take: number } | undefined,
  tableState: ServerTableQueryState,
) {
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
    where: buildTemplatesWhere(tableState.searchQuery),
    orderBy: buildTemplatesOrderBy(tableState),
    ...(pagination ?? {}),
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

async function loadTemplatesPageData(page: number, tableState: ServerTableQueryState) {
  const where = buildTemplatesWhere(tableState.searchQuery)
  const totalItems = await prisma.flooringTemplate.count({ where })
  const pagination = createServerPagination({ page, totalItems })
  const [initialTemplates, properties, warehouses, padProducts] = await Promise.all([
    listTemplates({ skip: pagination.skip, take: pagination.take }, tableState),
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
  ])

  return {
    pagination: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalItems: pagination.totalItems,
      totalPages: pagination.totalPages,
    },
    tableState,
    initialTemplates,
    propertyOptions: properties,
    warehouseOptions: warehouses,
    padProductOptions: padProducts.map((product) => ({
      id: product.id,
      label: buildPadLabel(product),
    })),
  }
}

export async function getTemplatesPageData(page: number, tableState: ServerTableQueryState) {
  return withPrismaConnectivityHandling(() => loadTemplatesPageData(page, tableState))
}

export async function getTemplateDetailPageData(id: string): Promise<PrismaDetailPageResult<{
  template: Awaited<ReturnType<typeof getTemplateById>>
  propertyOptions: Awaited<ReturnType<typeof loadTemplateRecordDetailOptions>>["propertyOptions"]
  warehouseOptions: Awaited<ReturnType<typeof loadTemplateRecordDetailOptions>>["warehouseOptions"]
  padProductOptions: Awaited<ReturnType<typeof loadTemplateRecordDetailOptions>>["padProductOptions"]
  productOptions: Awaited<ReturnType<typeof loadTemplateRecordDetailOptions>>["productOptions"]
  serviceOptions: Awaited<ReturnType<typeof loadTemplateRecordDetailOptions>>["serviceOptions"]
  unitOptions: Awaited<ReturnType<typeof loadTemplateRecordDetailOptions>>["unitOptions"]
}>> {
  try {
    const [template, options] = await Promise.all([
      getTemplateById(id),
      loadTemplateRecordDetailOptions(),
    ])

    return {
      ok: true,
      data: {
        template,
        ...options,
      },
    }
  } catch (error) {
    if (isPrismaNotFoundError(error)) {
      return { ok: false, notFound: true }
    }

    return {
      ok: false,
      error: createPrismaPageLoadIssue(error, {
        code: "TEMPLATE_DETAIL",
        title: "Template Unavailable",
        message: "The app could not load this template.",
        detail: "Try refreshing the page. If this keeps happening, check the database connection and record availability.",
      }),
    }
  }
}
