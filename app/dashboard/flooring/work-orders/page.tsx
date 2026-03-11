import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isToolUnlocked } from "@/lib/tool-subscriptions"
import { redirect } from "next/navigation"
import WorkOrdersClient from "./work-orders-client"

type PropertyOption = {
  id: string
  name: string
  address: string
}

type WarehouseOption = {
  id: string
  name: string
}

type ProductOption = {
  id: string
  name: string
  sendUnit: string
}

type WorkOrderRow = {
  id: string
  workOrderNumber: number
  propertyId: string
  propertyName: string
  propertyAddress: string
  warehouseId: string
  warehouseName: string
  status: string
  statusLabel: string
  vacancy: "VACANT" | "OCCUPIED" | null
  date: string | null
  unitText: string
  unitNumber: string
  unitType: string
  customAddress: string
  instructions: string
  notes: string
  workOrderImageUrl: string
  itemsCount: number
  createdAt: string
  updatedAt: string
}

const ADDRESS_SEPARATOR = ", "

function normalizeAddress(value: {
  streetAddress: string | null
  city: string | null
  state: string | null
  postalCode: string | null
}) {
  return [value.streetAddress, value.city, value.state, value.postalCode].filter(Boolean).join(ADDRESS_SEPARATOR)
}

export default async function WorkOrdersPage() {
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

  const [workOrders, properties, warehouses, products] = await Promise.all([
    prisma.flooringWorkOrder.findMany({
      include: {
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
        warehouse: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            items: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 250,
    }),
    prisma.propertyHub.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        streetAddress: true,
        city: true,
        state: true,
        postalCode: true,
      },
    }),
    prisma.flooringWarehouse.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.flooringProduct.findMany({
      orderBy: [{ manufacturerName: "asc" }, { style: "asc" }, { color: "asc" }],
      select: {
        id: true,
        manufacturerName: true,
        style: true,
        color: true,
        category: { select: { sendUnit: true } },
      },
    }),
  ])

  const initialWorkOrders: WorkOrderRow[] = workOrders.map((row, index) => ({
    id: row.id,
    workOrderNumber: workOrders.length - index,
    propertyId: row.propertyId,
    propertyName: row.property.name,
    propertyAddress: normalizeAddress({
      streetAddress: row.property.streetAddress,
      city: row.property.city,
      state: row.property.state,
      postalCode: row.property.postalCode,
    }),
    warehouseId: row.warehouse?.id ?? "",
    warehouseName: row.warehouse?.name ?? "",
    status: row.status,
    statusLabel: row.status,
    vacancy: row.vacancy,
    date: row.scheduledFor?.toISOString() ?? null,
    unitText: row.unitLabel ?? "",
    unitNumber: row.unitNumber === null ? "" : String(row.unitNumber),
    unitType: row.unitType ?? "",
    customAddress: row.customAddress ?? "",
    instructions: row.instructions ?? "",
    notes: row.notes ?? "",
    workOrderImageUrl: row.googleDriveSlip ?? "",
    itemsCount: row._count.items,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }))

  const propertyOptions: PropertyOption[] = properties.map((property) => ({
    id: property.id,
    name: property.name,
    address: normalizeAddress({
      streetAddress: property.streetAddress,
      city: property.city,
      state: property.state,
      postalCode: property.postalCode,
    }),
  }))

  return (
    <WorkOrdersClient
      initialWorkOrders={initialWorkOrders}
      propertyOptions={propertyOptions}
      warehouseOptions={warehouses as WarehouseOption[]}
      productOptions={products.map((product): ProductOption => ({
        id: product.id,
        name: [product.manufacturerName, product.style, product.color].filter(Boolean).join(" - ") || "Flooring Product",
        sendUnit: product.category.sendUnit ?? "",
      }))}
    />
  )
}
