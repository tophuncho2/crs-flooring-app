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
  templates: Array<{
    id: string
    templateTag: string
    warehouseName: string
    itemsCount: number
  }>
}

type ManagementCompanyOption = {
  id: string
  name: string
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

  const [properties, managementCompanies, warehouses, padProducts, products] = await Promise.all([
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
        flooringTpls: {
          select: {
            id: true,
            templateTag: true,
            warehouse: { select: { name: true } },
            _count: { select: { items: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    prisma.flooringManagementCompany.findMany({
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
    templates: property.flooringTpls.map((template) => ({
      id: template.id,
      templateTag: template.templateTag,
      warehouseName: template.warehouse?.name ?? "",
      itemsCount: template._count.items,
    })),
  }))

  const managementOptions: ManagementCompanyOption[] = managementCompanies.map((company) => ({
    id: company.id,
    name: company.name,
  }))

  return (
    <PropertiesClient
      initialProperties={initialProperties}
      managementOptions={managementOptions}
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
