import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/server/auth/auth-options"
import { prisma } from "@/server/db/prisma"
import { isToolUnlocked } from "@/server/platform/tool-subscriptions"
import ManufacturersClient from "@/features/flooring/manufacturers/components/manufacturers-client"
import { listManufacturers } from "@/features/flooring/manufacturers/queries"
import { normalizeManufacturer } from "@/features/flooring/manufacturers/services"

export default async function ManufacturersPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true },
  })

  if (!user) redirect("/login")
  if (!(await isToolUnlocked({ userId: user.id, role: user.role, slug: "products" }))) redirect("/dashboard/flooring/work-orders")

  const manufacturers = await listManufacturers()

  return (
    <ManufacturersClient
      initialManufacturers={manufacturers.map(normalizeManufacturer)}
    />
  )
}
