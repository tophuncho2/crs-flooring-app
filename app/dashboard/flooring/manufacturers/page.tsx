import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isToolUnlocked } from "@/lib/tool-subscriptions"
import { findFlooringManufacturers, getVisibleManufacturerAgentName } from "@/lib/flooring-db-compat"
import ManufacturersClient from "./manufacturers-client"

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
