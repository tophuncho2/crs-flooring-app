import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { normalizePrismaError, parseDecimal, parseOptionalString, parseRequiredString } from "@/lib/api-helpers"
import { ensureBuilderOrAdmin } from "@/lib/route-auth"

function normalizeCutLog(log: {
  id: string
  inventoryId: string
  before: { toString(): string }
  cut: { toString(): string }
  after: { toString(): string }
  notes: string | null
  createdAt: Date
  inventory: {
    id: string
    itemNumber: string
    product: {
      name: string
      manufacturerName: string | null
      style: string | null
      color: string | null
    }
  }
}) {
  return {
    id: log.id,
    inventoryId: log.inventoryId,
    inventoryLabel:
      log.inventory.product.name ||
      [log.inventory.product.manufacturerName, log.inventory.product.style, log.inventory.product.color].filter(Boolean).join(" - ") ||
      "Flooring Product",
    itemNumber: log.inventory.itemNumber,
    before: log.before.toString(),
    cut: log.cut.toString(),
    after: log.after.toString(),
    notes: log.notes ?? "",
    createdAt: log.createdAt.toISOString(),
  }
}

export async function GET(request: Request) {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "warehouse" })
  if (authError) return authError

  try {
    const { searchParams } = new URL(request.url)
    const inventoryId = searchParams.get("inventoryId")?.trim() || null

    const logs = await prisma.flooringCutLog.findMany({
      where: inventoryId ? { inventoryId } : undefined,
      include: {
        inventory: {
          select: {
            id: true,
            itemNumber: true,
            product: {
              select: {
                name: true,
                manufacturerName: true,
                style: true,
                color: true,
              },
            },
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
      take: 250,
    })

    return NextResponse.json({ cutLogs: logs.map(normalizeCutLog) })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}

export async function POST(request: Request) {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "warehouse" })
  if (authError) return authError

  try {
    const body = (await request.json()) as Record<string, unknown>
    const inventoryId = parseRequiredString(body.inventoryId, "inventoryId")
    const cut = parseDecimal(body.cut ?? body.quantityTaken, "cut", 2)

    const inventory = await prisma.flooringInventory.findUnique({
      where: { id: inventoryId },
      select: {
        stockCount: true,
        cutLogs: {
          select: {
            cut: true,
          },
        },
      },
    })

    if (!inventory) {
      return NextResponse.json({ error: "Inventory row not found" }, { status: 404 })
    }

    const cutTotal = inventory.cutLogs.reduce((sum, log) => sum.plus(log.cut), new Prisma.Decimal(0))
    const runningBalance = inventory.stockCount.minus(cutTotal)

    if (cut.gt(0) && runningBalance.lte(0)) {
      return NextResponse.json({ error: "This inventory row has no running balance left" }, { status: 400 })
    }

    if (cut.gt(runningBalance)) {
      return NextResponse.json({ error: "Quantity taken cannot exceed the current running balance" }, { status: 400 })
    }

    const created = await prisma.flooringCutLog.create({
      data: {
        inventoryId,
        before: runningBalance,
        cut,
        after: runningBalance.minus(cut),
        notes: parseOptionalString(body.notes),
      },
      include: {
        inventory: {
          select: {
            id: true,
            itemNumber: true,
            product: {
              select: {
                name: true,
                manufacturerName: true,
                style: true,
                color: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json({ cutLog: normalizeCutLog(created) }, { status: 201 })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}
