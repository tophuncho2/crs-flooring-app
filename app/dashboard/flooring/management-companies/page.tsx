import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isToolUnlocked } from "@/lib/tool-subscriptions"
import ManagementCompaniesClient from "./management-companies-client"

type ManagementCompanyRow = {
  id: string
  name: string
  streetAddress: string
  city: string
  state: string
  zip: string
  phone: string
  email: string
  fullAddress: string
  properties: { id: string; name: string; fullAddress: string }[]
}

type PropertyOption = {
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

export default async function ManagementCompaniesPage() {
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

  const [companies, properties] = await Promise.all([
    prisma.flooringManagementCompany.findMany({
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
        properties: {
          select: {
            property: {
              select: {
                id: true,
                name: true,
                streetAddress: true,
                city: true,
                state: true,
                postalCode: true,
              },
            },
          },
        },
      },
    }),
    prisma.propertyHub.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ])

  const initialCompanies: ManagementCompanyRow[] = companies.map((company) => ({
    id: company.id,
    name: company.name,
    streetAddress: company.streetAddress ?? "",
    city: company.city ?? "",
    state: company.state ?? "",
    zip: company.postalCode ?? "",
    phone: company.phone ?? "",
    email: company.email ?? "",
    fullAddress: normalizeAddress({
      streetAddress: company.streetAddress,
      city: company.city,
      state: company.state,
      postalCode: company.postalCode,
    }),
    properties: company.properties.map((link) => ({
      id: link.property.id,
      name: link.property.name,
      fullAddress: normalizeAddress({
        streetAddress: link.property.streetAddress,
        city: link.property.city,
        state: link.property.state,
        postalCode: link.property.postalCode,
      }),
    })),
  }))

  const propertyOptions: PropertyOption[] = properties.map((property) => ({
    id: property.id,
    name: property.name,
  }))

  return <ManagementCompaniesClient initialCompanies={initialCompanies} propertyOptions={propertyOptions} />
}
