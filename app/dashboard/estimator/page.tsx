import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import EstimatorClient from "./estimator-client"
import { isToolUnlocked } from "@/lib/tool-subscriptions"

type ProductOption = {
  id: string
  name: string
  measureUnit: string | null
  unitOfMeasure: string
  customerPrice: string
}

export default async function EstimatorPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    redirect("/login")
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true },
  })

  if (!user) {
    redirect("/login")
  }

  if (!(await isToolUnlocked({ userId: user.id, role: user.role, slug: "estimator" }))) {
    redirect("/dashboard")
  }

  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      customerCost: true,
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
    measureUnit: product.category.altUnit,
    unitOfMeasure: product.category.purchaseUnit,
    customerPrice: product.customerCost.toString(),
  }))

  return <EstimatorClient products={productOptions} />
}
