import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isToolUnlocked } from "@/lib/tool-subscriptions"
import CategoriesClient from "./categories-client"

type CategoryRow = {
  id: string
  name: string
  sendUnit: string
  stockUnit: string
  coverageAvailableUnit: string
  itemCoverageUnit: string
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
  if (!(await isToolUnlocked({ userId: user.id, role: user.role, slug: "products" }))) redirect("/dashboard")

  const categories = await prisma.flooringCategory.findMany({
    include: {
      _count: {
        select: { products: true },
      },
    },
    orderBy: { name: "asc" },
  })

  const initialCategories: CategoryRow[] = categories.map((category) => ({
    id: category.id,
    name: category.name,
    sendUnit: category.sendUnit ?? "",
    stockUnit: category.stockUnit ?? "",
    coverageAvailableUnit: category.coverageAvailableUnit ?? "",
    itemCoverageUnit: category.itemCoverageUnit ?? "",
    productCount: category._count.products,
    createdAt: category.createdAt.toISOString(),
  }))

  return <CategoriesClient initialCategories={initialCategories} />
}
