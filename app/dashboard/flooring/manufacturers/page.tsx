import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/server/auth/auth-options"
import { prisma } from "@/server/db/prisma"
import { isToolUnlocked } from "@/server/platform/tool-subscriptions"
import { findFlooringManufacturers, getVisibleManufacturerAgentName } from "@/server/flooring/db-compat"
import ManufacturersClient from "@/features/flooring/manufacturers/components/manufacturers-client"

export default async function ManufacturersPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true },
  })

  if (!user) redirect("/login")
  if (!(await isToolUnlocked({ userId: user.id, role: user.role, slug: "products" }))) redirect("/dashboard")

  const manufacturers = await findFlooringManufacturers()

  return (
    <ManufacturersClient
      initialManufacturers={manufacturers.map((manufacturer) => ({
        id: manufacturer.id,
        name: getVisibleManufacturerAgentName(manufacturer.name, manufacturer.companyName),
        companyName: manufacturer.companyName ?? "",
        website: manufacturer.website ?? "",
        phone: manufacturer.phone ?? "",
        email: manufacturer.email ?? "",
        productsCount: manufacturer._count?.products ?? 0,
        createdAt: manufacturer.createdAt.toISOString(),
        updatedAt: manufacturer.updatedAt.toISOString(),
      }))}
    />
  )
}
