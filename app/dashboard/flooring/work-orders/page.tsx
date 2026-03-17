import { getServerSession } from "next-auth"
import { authOptions } from "@/server/auth/auth-options"
import { prisma } from "@/server/db/prisma"
import { isToolUnlocked } from "@/server/platform/tool-subscriptions"
import { redirect } from "next/navigation"
import { getWorkOrdersPageData } from "@/features/flooring/work-orders/queries"
import WorkOrdersClient from "@/features/flooring/work-orders/components/work-orders-client"

export default async function WorkOrdersPage() {
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

  if (!(await isToolUnlocked({ userId: user.id, role: user.role, slug: "warehouse" }))) {
    redirect("/dashboard/flooring/work-orders")
  }
  const pageData = await getWorkOrdersPageData()

  return (
    <WorkOrdersClient
      initialWorkOrders={pageData.initialWorkOrders}
      propertyOptions={pageData.propertyOptions}
      warehouseOptions={pageData.warehouseOptions}
      productOptions={pageData.productOptions}
      templateOptions={pageData.templateOptions}
      serviceOptions={pageData.serviceOptions}
      unitOptions={pageData.unitOptions}
    />
  )
}
