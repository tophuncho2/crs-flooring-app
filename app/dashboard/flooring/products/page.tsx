import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { Prisma } from "@prisma/client"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isToolUnlocked } from "@/lib/tool-subscriptions"
import FlooringProductsClient from "./products-client"

function normalizeCategory(category: {
  id: string
  name: string
  sendUnit: string | null
  stockUnit: string | null
  coverageAvailableUnit: string | null
  itemCoverageUnit: string | null
  createdAt: Date
  _count: { products: number }
}) {
  return {
    id: category.id,
    name: category.name,
    sendUnit: category.sendUnit ?? "",
    stockUnit: category.stockUnit ?? "",
    coverageAvailableUnit: category.coverageAvailableUnit ?? "",
    itemCoverageUnit: category.itemCoverageUnit ?? "",
    productCount: category._count.products,
    createdAt: category.createdAt.toISOString(),
  }
}

function normalizeProduct(product: {
  id: string
  name: string
  categoryId: string
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
    sendUnit: string | null
    stockUnit: string | null
    coverageAvailableUnit: string | null
    itemCoverageUnit: string | null
  }
}) {
  return {
    id: product.id,
    name: product.name,
    categoryId: product.categoryId,
    manufacturerName: product.manufacturerName ?? "",
    style: product.style ?? "",
    color: product.color ?? "",
    width: product.width ?? "",
    sheetSize: product.sheetSize ?? "",
    thickness: product.thickness ?? "",
    unitWeight: product.unitWeight ?? "",
    baseColor: product.baseColor ?? "",
    coveragePerUnit: product.coveragePerUnit?.toString() ?? "",
    coverageUnit: product.category.itemCoverageUnit ?? "",
    photoUrls: product.photoUrls,
    notes: product.notes ?? "",
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
    category: {
      id: product.category.id,
      name: product.category.name,
      sendUnit: product.category.sendUnit ?? "",
      stockUnit: product.category.stockUnit ?? "",
      coverageAvailableUnit: product.category.coverageAvailableUnit ?? "",
      itemCoverageUnit: product.category.itemCoverageUnit ?? "",
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
  if (!(await isToolUnlocked({ userId: user.id, role: user.role, slug: "products" }))) redirect("/dashboard")

  const [categories, products] = await Promise.all([
    prisma.flooringCategory.findMany({
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.flooringProduct.findMany({
      include: {
        category: {
          select: {
            id: true,
            name: true,
            sendUnit: true,
            stockUnit: true,
            coverageAvailableUnit: true,
            itemCoverageUnit: true,
          },
        },
      },
      orderBy: [{ category: { name: "asc" } }, { manufacturerName: "asc" }, { style: "asc" }, { color: "asc" }],
    }),
  ])

  return (
    <FlooringProductsClient
      initialCategories={categories.map(normalizeCategory)}
      initialProducts={products.map(normalizeProduct)}
    />
  )
}
