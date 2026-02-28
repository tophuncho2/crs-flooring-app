import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "../../api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import EstimatorClient from "./estimator-client"

type ProductOption = {
  id: string
  name: string
  altUnit: string | null
  purchaseUnit: string
}

export default async function EstimatorPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  if (session.user.role !== "BUILDER" && session.user.role !== "ADMIN") {
    redirect("/dashboard")
  }

  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      category: {
        select: {
          altUnit: true,
          purchaseUnit: true,
        },
      },
    },
    orderBy: { name: "asc" },
  })

  const productOptions: ProductOption[] = products.map((product) => ({
    id: product.id,
    name: product.name,
    altUnit: product.category.altUnit,
    purchaseUnit: product.category.purchaseUnit,
  }))

  return <EstimatorClient products={productOptions} />
}
