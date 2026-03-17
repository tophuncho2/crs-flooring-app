import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/server/auth/auth-options"
import { prisma } from "@/server/db/prisma"
import { isToolUnlocked } from "@/server/platform/tool-subscriptions"
import { getTemplatesPageData } from "@/features/flooring/templates/queries"
import TemplatesClient from "@/features/flooring/templates/components/templates-client"

export default async function TemplatesPage() {
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
  const pageData = await getTemplatesPageData()

  return (
    <TemplatesClient
      initialTemplates={pageData.initialTemplates}
      propertyOptions={pageData.propertyOptions}
      warehouseOptions={pageData.warehouseOptions}
      padProductOptions={pageData.padProductOptions}
      productOptions={pageData.productOptions}
      serviceOptions={pageData.serviceOptions}
      unitOptions={pageData.unitOptions}
    />
  )
}
