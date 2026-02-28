import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { normalizePrismaError, parseRequiredString } from "@/lib/api-helpers"
import { ensureBuilderOrAdmin } from "@/lib/route-auth"

export async function GET(request: Request) {
  const authError = await ensureBuilderOrAdmin()
  if (authError) return authError

  try {
    const { searchParams } = new URL(request.url)
    const warehouseId = searchParams.get("warehouseId")

    const sections = await prisma.flooringSection.findMany({
      where: warehouseId ? { warehouseId } : undefined,
      include: { _count: { select: { locations: true } } },
      orderBy: { name: "asc" },
    })

    return NextResponse.json({ sections })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}

export async function POST(request: Request) {
  const authError = await ensureBuilderOrAdmin()
  if (authError) return authError

  try {
    const body = (await request.json()) as Record<string, unknown>
    const section = await prisma.flooringSection.create({
      data: {
        warehouseId: parseRequiredString(body.warehouseId, "warehouseId"),
        name: parseRequiredString(body.name, "name"),
      },
      include: { _count: { select: { locations: true } } },
    })

    return NextResponse.json({ section }, { status: 201 })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}
