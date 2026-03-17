import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/server/auth/auth-options"
import { prisma } from "@/server/db/prisma"
import { isToolUnlocked } from "@/server/platform/tool-subscriptions"
import FlooringProductsClient from "@/features/flooring/products/components/products-client"
import { Prisma } from "@prisma/client"
import { flooringCategoryUnitInclude, normalizeCategoryUnitValues } from "@/server/flooring/unit-measures"
import { listManufacturers } from "@/features/flooring/manufacturers/queries"

function normalizeProduct(product: {
  id: string
  name: string
  categoryId: string
  manufacturerId: string | null
  manufacturerName: string | null
  style: string | null
  color: string | null
  width: string | null
  sheetSize: string | null
  thickness: string | null
  unitWeight: string | null
  baseColor: string | null
  coveragePerUnit: Prisma.Decimal | null
  photoUrls: string[]
  notes: string | null
  createdAt: Date
  updatedAt: Date
  category: {
    id: string
    name: string
    sendUnit: { id: string; name: string } | null
    stockUnit: { id: string; name: string } | null
    coverageAvailableUnit: { id: string; name: string } | null
    itemCoverageUnit: { id: string; name: string } | null
    serviceUnit: { id: string; name: string } | null
  }
  manufacturer: {
    id: string
    name: string
    companyName: string | null
    website: string | null
  } | null
}) {
  return {
    id: product.id,
    name: product.name,
    categoryId: product.categoryId,
    manufacturerId: product.manufacturerId ?? "",
    manufacturerName: product.manufacturer?.companyName ?? product.manufacturer?.name ?? product.manufacturerName ?? "",
    style: product.style ?? "",
    color: product.color ?? "",
    width: product.width ?? "",
    sheetSize: product.sheetSize ?? "",
    thickness: product.thickness ?? "",
    unitWeight: product.unitWeight ?? "",
    baseColor: product.baseColor ?? "",
    coveragePerUnit: product.coveragePerUnit?.toString() ?? "",
    coverageUnit: product.category.itemCoverageUnit?.name ?? "",
    photoUrls: product.photoUrls,
    notes: product.notes ?? "",
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
    category: {
      id: product.category.id,
      name: product.category.name,
      ...normalizeCategoryUnitValues(product.category),
    },
  }
}

export default async function FlooringProductsPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true },
  })

  if (!user) redirect("/login")
  if (!(await isToolUnlocked({ userId: user.id, role: user.role, slug: "products" }))) redirect("/dashboard/flooring/work-orders")

  const [categories, manufacturers, products] = await Promise.all([
    prisma.flooringCategory.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        ...flooringCategoryUnitInclude,
      },
    }),
    listManufacturers(),
    prisma.flooringProduct.findMany({
      include: {
        category: {
          select: {
            id: true,
            name: true,
            ...flooringCategoryUnitInclude,
          },
        },
        manufacturer: {
          select: {
            id: true,
            name: true,
            companyName: true,
            website: true,
          },
        },
      },
      orderBy: [{ category: { name: "asc" } }, { manufacturerName: "asc" }, { style: "asc" }, { color: "asc" }],
    }),
  ])

  return (
    <FlooringProductsClient
      categoryOptions={categories.map((category) => ({
        id: category.id,
        name: category.name,
        ...normalizeCategoryUnitValues(category),
      }))}
      manufacturerOptions={manufacturers.map((manufacturer) => ({
        id: manufacturer.id,
        name: manufacturer.companyName ?? manufacturer.name,
        website: manufacturer.website ?? "",
        phone: manufacturer.phone ?? "",
        email: manufacturer.email ?? "",
      }))}
      initialProducts={products.map(normalizeProduct)}
    />
  )
}
