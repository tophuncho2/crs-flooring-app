import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/server/auth/auth-options"
import { prisma } from "@/server/db/prisma"
import { isToolUnlocked } from "@/server/platform/tool-subscriptions"
import ManagementCompaniesClient from "@/features/flooring/management-companies/components/management-companies-client"

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

type WarehouseOption = {
  id: string
  name: string
}

type ProductOption = {
  id: string
  label: string
  sendUnit: string
}

function normalizeAddress(value: {
  streetAddress: string | null
  city: string | null
  state: string | null
  postalCode: string | null
}) {
  return [value.streetAddress, value.city, value.state, value.postalCode].filter(Boolean).join(", ")
}

function buildPadLabel(product: {
  manufacturerName: string | null
  style: string | null
  color: string | null
}) {
  return [product.manufacturerName, product.style, product.color].filter(Boolean).join(" - ") || "Pad Product"
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
    redirect("/dashboard/flooring/work-orders")
  }

  const [companies, properties, warehouses, padProducts, products] = await Promise.all([
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
    prisma.flooringWarehouse.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.flooringProduct.findMany({
      where: {
        category: {
          name: "Pad",
        },
      },
      orderBy: [{ manufacturerName: "asc" }, { style: "asc" }, { color: "asc" }],
      select: {
        id: true,
        manufacturerName: true,
        style: true,
        color: true,
      },
    }),
    prisma.flooringProduct.findMany({
      orderBy: [{ manufacturerName: "asc" }, { style: "asc" }, { color: "asc" }],
      select: {
        id: true,
        manufacturerName: true,
        style: true,
        color: true,
        category: {
          select: { sendUnit: { select: { name: true } } },
        },
      },
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

  return (
    <ManagementCompaniesClient
      initialCompanies={initialCompanies}
      propertyOptions={properties.map((property): PropertyOption => ({
        id: property.id,
        name: property.name,
      }))}
      warehouseOptions={warehouses as WarehouseOption[]}
      padProductOptions={padProducts.map((product) => ({
        id: product.id,
        label: buildPadLabel(product),
      }))}
      productOptions={products.map((product): ProductOption => ({
        id: product.id,
        label: [product.manufacturerName, product.style, product.color].filter(Boolean).join(" - ") || "Flooring Product",
        sendUnit: product.category.sendUnit?.name ?? "",
      }))}
    />
  )
}
