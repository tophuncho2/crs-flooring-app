import { prisma } from "@builders/db"
import { createAppError, parseOptionalString, parseRequiredString } from "@/server/http/api-helpers"
import { flooringCategoryUnitInclude, normalizeCategoryUnitValues } from "@/server/flooring/unit-measures"
import { normalizeCategoryName, validateCategoryForm } from "../validators"
import type { CategoryForm, CategoryRow } from "../domain/types"

const categoryInclude = {
  ...flooringCategoryUnitInclude,
  _count: {
    select: { products: true },
  },
} as const

function normalizeCategory(category: {
  id: string
  name: string
  sendUnit: { id: string; name: string } | null
  stockUnit: { id: string; name: string } | null
  coverageAvailableUnit: { id: string; name: string } | null
  itemCoverageUnit: { id: string; name: string } | null
  serviceUnit: { id: string; name: string } | null
  createdAt: Date
  updatedAt: Date
  _count?: { products: number }
}): CategoryRow {
  return {
    id: category.id,
    name: category.name,
    ...normalizeCategoryUnitValues(category),
    productCount: category._count?.products ?? 0,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  }
}

function parseCategoryForm(body: Record<string, unknown>): CategoryForm {
  return {
    name: parseRequiredString(body.name, "name"),
    sendUnitId: parseOptionalString(body.sendUnitId) ?? "",
    stockUnitId: parseOptionalString(body.stockUnitId) ?? "",
    coverageAvailableUnitId: parseOptionalString(body.coverageAvailableUnitId) ?? "",
    itemCoverageUnitId: parseOptionalString(body.itemCoverageUnitId) ?? "",
    serviceUnitId: parseOptionalString(body.serviceUnitId) ?? "",
  }
}

async function assertCategoryNameAvailable(name: string, currentId?: string) {
  const existing = await prisma.flooringCategory.findFirst({
    where: {
      name: {
        equals: name,
        mode: "insensitive",
      },
      ...(currentId ? { NOT: { id: currentId } } : {}),
    },
    select: {
      id: true,
    },
  })

  if (existing) {
    throw createAppError("Category name must be unique", {
      status: 409,
      field: "name",
    })
  }
}

export function validateUpdateCategoryPrimarySectionInput(body: Record<string, unknown>) {
  const input = parseCategoryForm(body)
  const validationError = validateCategoryForm(input)
  if (validationError) {
    throw createAppError(validationError, { field: "name" })
  }

  return input
}

export async function createCategoryRecord(input: CategoryForm) {
  await assertCategoryNameAvailable(normalizeCategoryName(input.name))

  const category = await prisma.flooringCategory.create({
    data: {
      name: input.name.trim(),
      sendUnitId: input.sendUnitId || null,
      stockUnitId: input.stockUnitId || null,
      coverageAvailableUnitId: input.coverageAvailableUnitId || null,
      itemCoverageUnitId: input.itemCoverageUnitId || null,
      serviceUnitId: input.serviceUnitId || null,
    },
    include: categoryInclude,
  })

  return normalizeCategory(category)
}

export async function replaceCategoryPrimarySection(id: string, input: CategoryForm) {
  await assertCategoryNameAvailable(normalizeCategoryName(input.name), id)

  const category = await prisma.flooringCategory.update({
    where: { id },
    data: {
      name: input.name.trim(),
      sendUnitId: input.sendUnitId || null,
      stockUnitId: input.stockUnitId || null,
      coverageAvailableUnitId: input.coverageAvailableUnitId || null,
      itemCoverageUnitId: input.itemCoverageUnitId || null,
      serviceUnitId: input.serviceUnitId || null,
    },
    include: categoryInclude,
  })

  return normalizeCategory(category)
}

export async function deleteCategoryRecord(id: string) {
  const category = await prisma.flooringCategory.findUnique({
    where: { id },
    select: {
      id: true,
      _count: {
        select: {
          products: true,
        },
      },
    },
  })

  if (!category) {
    throw createAppError("Category not found", { status: 404 })
  }

  if (category._count.products > 0) {
    throw createAppError("This category is linked to products and cannot be deleted", {
      status: 409,
      field: "products",
    })
  }

  await prisma.flooringCategory.delete({
    where: { id },
  })

  return { success: true } as const
}
