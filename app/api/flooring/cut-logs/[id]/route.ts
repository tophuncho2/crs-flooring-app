import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/server/db/prisma"
import { normalizePrismaError } from "@/server/http/api-helpers"
import { ensureBuilderOrAdmin } from "@/server/auth/route-auth"

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "warehouse" })
  if (authError) return authError

  try {
    const { id } = await context.params
    const target = await prisma.flooringCutLog.findUnique({
      where: { id },
      select: { id: true, inventoryId: true },
    })

    if (!target) {
      return NextResponse.json({ error: "Cut log not found" }, { status: 404 })
    }

    const inventory = await prisma.flooringInventory.findUnique({
      where: { id: target.inventoryId },
      select: {
        id: true,
        stockCount: true,
        cutLogs: {
          where: { id: { not: target.id } },
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          select: {
            id: true,
            cut: true,
          },
        },
      },
    })

    if (!inventory) {
      return NextResponse.json({ error: "Inventory row not found" }, { status: 404 })
    }

    const updates: Array<ReturnType<typeof prisma.flooringCutLog.update>> = []
    const updatedRows: Array<{ id: string; before: string; after: string }> = []
    let runningBalance = new Prisma.Decimal(inventory.stockCount)

    for (const cutLog of inventory.cutLogs) {
      const before = runningBalance
      const after = before.minus(cutLog.cut)
      updates.push(
        prisma.flooringCutLog.update({
          where: { id: cutLog.id },
          data: { before, after },
        }),
      )
      updatedRows.push({ id: cutLog.id, before: before.toString(), after: after.toString() })
      runningBalance = after
    }

    await prisma.$transaction([
      prisma.flooringCutLog.delete({
        where: { id: target.id },
      }),
      ...updates,
    ])

    return NextResponse.json({
      success: true,
      inventoryId: target.inventoryId,
      updatedRows,
    })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}
