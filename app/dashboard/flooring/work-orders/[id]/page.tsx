import { getServerSession } from "next-auth"
import { notFound, redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isToolUnlocked } from "@/lib/tool-subscriptions"
import WorkOrderDetailClient from "./work-order-detail-client"

type WorkOrderDetail = {
  id: string
  property: {
    id: string
    name: string
    address: string
  }
  warehouse: {
    id: string
    name: string
  } | null
  status: string
  vacancy: "VACANT" | "OCCUPIED" | null
  date: string | null
  unitText: string
  unitNumber: string
  unitType: string
  customAddress: string
  instructions: string
  notes: string
  workOrderImageUrl: string
  items: Array<{
    id: string
    productId: string
    productName: string
    sendUnit: string
    quantity: string
    notes: string
    linkedInventoryId: string
    linkedInventoryLabel: string
    changeOrderStatus: "SUFFICIENT" | "SHORTAGE"
  }>
}

type ProductOption = {
  id: string
  name: string
  sendUnit: string
}

type InventoryOption = {
  id: string
  name: string
  productId: string
}

function buildProductName(product: {
  manufacturerName: string | null
  style: string | null
  color: string | null
}) {
  return [product.manufacturerName, product.style, product.color].filter(Boolean).join(" - ") || "Flooring Product"
}

function normalizeAddress(value: {
  streetAddress: string | null
  city: string | null
  state: string | null
  postalCode: string | null
}) {
  return [value.streetAddress, value.city, value.state, value.postalCode].filter(Boolean).join(", ")
}

export default async function WorkOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
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

  const { id } = await params

  const workOrder = await prisma.flooringWorkOrder.findUnique({
    where: { id },
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
        select: { id: true, name: true },
      },
      items: {
        orderBy: { createdAt: "desc" },
        include: {
          product: {
            select: {
              id: true,
              manufacturerName: true,
              style: true,
              color: true,
              category: {
                select: {
                  sendUnit: { select: { name: true } },
                },
              },
            },
          },
          linkedInventory: {
            select: {
              id: true,
              itemNumber: true,
              dyeLot: true,
              location: {
                select: {
                  locationCode: true,
                  warehouse: { select: { name: true } },
                },
              },
            },
          },
        },
      },
    },
  })

  const productRows = await prisma.flooringProduct.findMany({
    orderBy: [{ manufacturerName: "asc" }, { style: "asc" }, { color: "asc" }],
    select: {
      id: true,
      manufacturerName: true,
      style: true,
      color: true,
      category: {
        select: {
          sendUnit: { select: { name: true } },
        },
      },
    },
  })

  const inventoryRows = await prisma.flooringInventory.findMany({
    where: {
      OR: [{ linkedWorkOrderItem: null }, { linkedWorkOrderItem: { workOrderId: id } }],
    },
    include: {
      product: {
        select: {
          manufacturerName: true,
          style: true,
          color: true,
        },
      },
      location: {
        select: {
          locationCode: true,
          warehouse: { select: { name: true } },
        },
      },
    },
    orderBy: [{ updatedAt: "desc" }],
  })

  const propertyOptions = await prisma.propertyHub.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      streetAddress: true,
      city: true,
      state: true,
      postalCode: true,
    },
  })

  const warehouseOptions = await prisma.flooringWarehouse.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  })

  if (!workOrder) {
    notFound()
  }

  const detail: WorkOrderDetail = {
    id: workOrder.id,
    property: {
      id: workOrder.property.id,
      name: workOrder.property.name,
      address: normalizeAddress({
        streetAddress: workOrder.property.streetAddress,
        city: workOrder.property.city,
        state: workOrder.property.state,
        postalCode: workOrder.property.postalCode,
      }),
    },
    warehouse: workOrder.warehouse
      ? {
          id: workOrder.warehouse.id,
          name: workOrder.warehouse.name,
        }
      : null,
    status: workOrder.status,
    vacancy: workOrder.vacancy,
    date: workOrder.scheduledFor ? workOrder.scheduledFor.toISOString() : null,
    unitText: workOrder.unitLabel ?? "",
    unitNumber: workOrder.unitNumber === null ? "" : String(workOrder.unitNumber),
    unitType: workOrder.unitType ?? "",
    customAddress: workOrder.customAddress ?? "",
    instructions: workOrder.instructions ?? "",
    notes: workOrder.notes ?? "",
    workOrderImageUrl: workOrder.googleDriveSlip ?? "",
    items: workOrder.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: buildProductName(item.product),
      sendUnit: item.product.category.sendUnit?.name ?? "",
      quantity: item.quantity.toString(),
      notes: item.notes ?? "",
      linkedInventoryId: item.linkedInventoryId ?? "",
      linkedInventoryLabel: item.linkedInventory
        ? `${item.linkedInventory.location.warehouse.name} / ${item.linkedInventory.location.locationCode} / Item ${item.linkedInventory.itemNumber}${item.linkedInventory.dyeLot ? ` / Dye ${item.linkedInventory.dyeLot}` : ""}`
        : "",
      changeOrderStatus: item.changeOrderStatus ?? "SUFFICIENT",
    })),
  }

  return (
    <WorkOrderDetailClient
      workOrder={detail}
      productOptions={productRows.map((product): ProductOption => ({
        id: product.id,
        name: buildProductName(product),
        sendUnit: product.category.sendUnit?.name ?? "",
      }))}
      inventoryOptions={inventoryRows.map((row): InventoryOption => ({
        id: row.id,
        productId: row.productId,
        name: `${buildProductName(row.product)} / ${row.location.warehouse.name} / ${row.location.locationCode} / Item ${row.itemNumber}${row.dyeLot ? ` / Dye ${row.dyeLot}` : ""}`,
      }))}
      propertyOptions={propertyOptions.map((property) => ({
        id: property.id,
        name: property.name,
        address: normalizeAddress({
          streetAddress: property.streetAddress,
          city: property.city,
          state: property.state,
          postalCode: property.postalCode,
        }),
      }))}
      warehouseOptions={warehouseOptions}
    />
  )
}
