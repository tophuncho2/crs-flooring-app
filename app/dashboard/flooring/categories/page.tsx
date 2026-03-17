import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/server/auth/auth-options"
import { flooringCategoryUnitInclude, normalizeCategoryUnitValues, normalizeUnitOfMeasureOption } from "@/server/flooring/unit-measures"
import { prisma } from "@/server/db/prisma"
import { isToolUnlocked } from "@/server/platform/tool-subscriptions"
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
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true },
  })

  if (!user) redirect("/login")
  if (!(await isToolUnlocked({ userId: user.id, role: user.role, slug: "products" }))) redirect("/dashboard/flooring/work-orders")

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
      initialCategories={initialCategories}
      unitOfMeasureOptions={unitOfMeasures.map(normalizeUnitOfMeasureOption)}
    />
  )
}
