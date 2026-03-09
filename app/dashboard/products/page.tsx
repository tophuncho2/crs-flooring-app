import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import ProductsManager from "./products-manager"
import { isToolUnlocked } from "@/lib/tool-subscriptions"
import type { CategoryDto, ProductDto } from "./types"

function toProductDto(product: {
  id: string
  name: string
  description: string | null
  categoryId: string
  internalCost: { toString(): string }
  customerCost: { toString(): string }
  laborRate: { toString(): string }
  coveragePerUnit: { toString(): string }
  isActive: boolean
  createdAt: Date
  category: {
    id: string
    name: string
    stockUnit: string
    purchaseUnit: string
    coverageUnit: string
    rateUnit: string
    altUnit: string | null
  }
}): ProductDto {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    categoryId: product.categoryId,
    internalCost: product.internalCost.toString(),
    customerCost: product.customerCost.toString(),
    laborRate: product.laborRate.toString(),
    coveragePerUnit: product.coveragePerUnit.toString(),
    isActive: product.isActive,
    createdAt: product.createdAt.toISOString(),
    category: product.category,
  }
}

function toCategoryDto(category: {
  id: string
  name: string
  stockUnit: string
  purchaseUnit: string
  coverageUnit: string
  rateUnit: string
  altUnit: string | null
  createdAt: Date
  _count: { products: number }
}): CategoryDto {
  return {
    id: category.id,
    name: category.name,
    stockUnit: category.stockUnit,
    purchaseUnit: category.purchaseUnit,
    coverageUnit: category.coverageUnit,
    rateUnit: category.rateUnit,
    altUnit: category.altUnit,
    createdAt: category.createdAt.toISOString(),
    productCount: category._count.products,
  }
}

export default async function ProductsPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true },
  })

  if (!user) {
    redirect("/login")
  }

  if (!(await isToolUnlocked({ userId: user.id, role: user.role, slug: "products" }))) {
    redirect("/dashboard")
  }

  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      include: {
        category: {
          select: {
            id: true,
            name: true,
            stockUnit: true,
            purchaseUnit: true,
            coverageUnit: true,
            rateUnit: true,
            altUnit: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.category.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { name: "asc" },
    }),
  ])

  return (
    <ProductsManager
      initialProducts={products.map(toProductDto)}
      initialCategories={categories.map(toCategoryDto)}
    />
  )
}
