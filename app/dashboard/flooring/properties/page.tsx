import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isToolUnlocked } from "@/lib/tool-subscriptions"
import PropertiesClient from "./properties-client"

type ManagementLink = {
  id: string
  name: string
}

type PropertyRow = {
  id: string
  name: string
  streetAddress: string
  city: string
  state: string
  zip: string
  phone: string
  email: string
  fullAddress: string
  managementCompany: ManagementLink | null
}

type ManagementCompanyOption = {
  id: string
  name: string
}

function normalizeAddress(value: {
  streetAddress: string | null
  city: string | null
  state: string | null
  postalCode: string | null
}) {
  return [value.streetAddress, value.city, value.state, value.postalCode].filter(Boolean).join(", ")
}

export default async function FlooringPropertiesPage() {
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
    redirect("/dashboard")
  }

  const [properties, managementCompanies] = await Promise.all([
    prisma.propertyHub.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        streetAddress: true,
        city: true,
        state: true,
        postalCode: true,
        phone: true,
        email: true,
        flooringLinks: {
          select: {
            managementCompany: { select: { id: true, name: true } },
          },
        },
      },
    }),
    prisma.flooringManagementCompany.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ])

  const initialProperties: PropertyRow[] = properties.map((property) => ({
    id: property.id,
    name: property.name,
    streetAddress: property.streetAddress ?? "",
    city: property.city ?? "",
    state: property.state ?? "",
    zip: property.postalCode ?? "",
    phone: property.phone ?? "",
    email: property.email ?? "",
    fullAddress: normalizeAddress(property),
    managementCompany: property.flooringLinks[0]?.managementCompany ?? null,
  }))

  const managementOptions: ManagementCompanyOption[] = managementCompanies.map((company) => ({
    id: company.id,
    name: company.name,
  }))

  return <PropertiesClient initialProperties={initialProperties} managementOptions={managementOptions} />
}
