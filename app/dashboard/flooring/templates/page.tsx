import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isToolUnlocked } from "@/lib/tool-subscriptions"
import TemplatesClient from "./templates-client"

type TemplateRow = {
  id: string
  templateTag: string
  propertyId: string
  propertyName: string
  warehouseId: string
  warehouseName: string
  instructions: string
  templateNotes: string
  padProductId: string
  padTypeLabel: string
  createdAt: string
  updatedAt: string
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

function buildPadLabel(product: {
  manufacturerName: string | null
  style: string | null
  color: string | null
}) {
  return [product.manufacturerName, product.style, product.color].filter(Boolean).join(" - ") || "Pad Product"
}

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
    redirect("/dashboard")
  }

  const [templates, properties, warehouses, padProducts, products] = await Promise.all([
    prisma.flooringTemplate.findMany({
      include: {
        property: {
          select: { id: true, name: true },
        },
        warehouse: {
          select: { id: true, name: true },
        },
        padProduct: {
          select: {
            id: true,
            manufacturerName: true,
            style: true,
            color: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 250,
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

  const initialTemplates: TemplateRow[] = templates.map((template) => ({
    id: template.id,
    templateTag: template.templateTag,
    propertyId: template.propertyId,
    propertyName: template.property.name,
    warehouseId: template.warehouse?.id ?? "",
    warehouseName: template.warehouse?.name ?? "",
    instructions: template.instructions ?? "",
    templateNotes: template.templateNotes ?? "",
    padProductId: template.padProduct?.id ?? "",
    padTypeLabel: template.padProduct ? buildPadLabel(template.padProduct) : "",
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  }))

  return (
    <TemplatesClient
      initialTemplates={initialTemplates}
      propertyOptions={properties as PropertyOption[]}
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
