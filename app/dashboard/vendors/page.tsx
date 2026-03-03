import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import VendorsClient from "./vendors-client"

type VendorDto = {
  id: string
  companyName: string
  phone: string
  email: string
  createdAt: string
}

export default async function VendorsPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    redirect("/login")
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { role: true },
  })

  if (!user) {
    redirect("/login")
  }

  if (user.role !== "BUILDER" && user.role !== "ADMIN") {
    redirect("/dashboard")
  }

  const vendors = await prisma.vendor.findMany({
    orderBy: [{ companyName: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      companyName: true,
      phone: true,
      email: true,
      createdAt: true,
    },
  })

  const initialVendors: VendorDto[] = vendors.map((vendor) => ({
    id: vendor.id,
    companyName: vendor.companyName,
    phone: vendor.phone ?? "",
    email: vendor.email ?? "",
    createdAt: vendor.createdAt.toISOString(),
  }))

  return <VendorsClient initialVendors={initialVendors} />
}
