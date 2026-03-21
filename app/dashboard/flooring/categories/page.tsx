import { canEditCategories } from "@/server/auth/access-control"
import { flooringCategoryUnitInclude, normalizeCategoryUnitValues, normalizeUnitOfMeasureOption } from "@/server/flooring/unit-measures"
import { prisma } from "@/server/db/prisma"
import { requireToolAccess } from "@/server/auth/session"
import CategoriesClient from "@/features/flooring/categories/components/categories-client"

type CategoryRow = {
  id: string
  name: string
  sendUnitId: string
  stockUnitId: string
  coverageAvailableUnitId: string
  itemCoverageUnitId: string
  serviceUnitId: string
  sendUnit: string
  stockUnit: string
  coverageAvailableUnit: string
  itemCoverageUnit: string
  serviceUnit: string
  productCount: number
  createdAt: string
}

export default async function FlooringCategoriesPage() {
  const user = await requireToolAccess("products")

  const [categories, unitOfMeasures] = await Promise.all([
    prisma.flooringCategory.findMany({
      include: {
        ...flooringCategoryUnitInclude,
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.flooringUnitOfMeasure.findMany({
      orderBy: { name: "asc" },
    }),
  ])

  const initialCategories: CategoryRow[] = categories.map((category) => ({
    id: category.id,
    name: category.name,
    ...normalizeCategoryUnitValues(category),
    productCount: category._count.products,
    createdAt: category.createdAt.toISOString(),
  }))

  return (
    <CategoriesClient
      canManage={canEditCategories(user.role)}
      initialCategories={initialCategories}
      unitOfMeasureOptions={unitOfMeasures.map(normalizeUnitOfMeasureOption)}
    />
  )
}
