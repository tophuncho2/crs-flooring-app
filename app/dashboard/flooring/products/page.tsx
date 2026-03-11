import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isToolUnlocked } from "@/lib/tool-subscriptions"
import { findFlooringManufacturers } from "@/lib/flooring-db-compat"
import FlooringProductsClient from "./products-client"
import { Prisma } from "@prisma/client"

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
    sendUnit: string | null
    stockUnit: string | null
    coverageAvailableUnit: string | null
    itemCoverageUnit: string | null
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

  const [categories, manufacturers, products] = await Promise.all([
    prisma.flooringCategory.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        sendUnit: true,
        stockUnit: true,
        coverageAvailableUnit: true,
        itemCoverageUnit: true,
      },
    }),
    findFlooringManufacturers(),
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
        sendUnit: category.sendUnit ?? "",
        stockUnit: category.stockUnit ?? "",
        coverageAvailableUnit: category.coverageAvailableUnit ?? "",
        itemCoverageUnit: category.itemCoverageUnit ?? "",
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
