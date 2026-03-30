import { prisma } from "@builders/db"
import { flooringCategoryUnitInclude, normalizeCategoryUnitValues } from "@/server/flooring/unit-measures"
import type { CategoryForm } from "../domain/types"

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
}) {
  return {
    id: category.id,
    name: category.name,
    ...normalizeCategoryUnitValues(category),
    productCount: category._count?.products ?? 0,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  }
}

export async function categoryNameExists(normalizedName: string, currentId?: string) {
  const existing = await prisma.flooringCategory.findFirst({
    where: {
      name: {
        equals: normalizedName,
        mode: "insensitive",
      },
      ...(currentId ? { NOT: { id: currentId } } : {}),
    },
    select: { id: true },
  })

  return Boolean(existing)
}

export async function getCategoryDeleteState(id: string) {
  return prisma.flooringCategory.findUnique({
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
}

export async function updateCategoryPrimaryRecord(id: string, input: CategoryForm) {
  await prisma.flooringCategory.update({
    where: { id },
    data: {
      name: input.name.trim(),
      sendUnitId: input.sendUnitId || null,
      stockUnitId: input.stockUnitId || null,
      coverageAvailableUnitId: input.coverageAvailableUnitId || null,
      itemCoverageUnitId: input.itemCoverageUnitId || null,
      serviceUnitId: input.serviceUnitId || null,
    },
  })
}

export async function createCategoryPrimaryRecord(input: CategoryForm) {
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

export async function deleteCategoryRecordById(id: string) {
  await prisma.flooringCategory.delete({
    where: { id },
  })
}
