import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { ensureBuilderOrAdmin } from "@/server/auth/route-auth"
import { normalizePrismaError } from "@/server/http/api-helpers"
import { createWorkOrderItem } from "@/features/flooring/work-orders/mutations"
import { listWorkOrderItems } from "@/features/flooring/work-orders/queries"
import { validateWorkOrderMaterialItemInput } from "@/features/flooring/work-orders/validators"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: RouteContext) {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "warehouse" })
  if (authError) return authError

  try {
    const { id } = await params
    return NextResponse.json({ items: await listWorkOrderItems(id) })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "warehouse" })
  if (authError) return authError

  try {
    const { id } = await params
    const body = (await request.json()) as Record<string, unknown>
    const item = await createWorkOrderItem(id, validateWorkOrderMaterialItemInput(body))
    return NextResponse.json({ item }, { status: 201 })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "That inventory row is already linked to another work order item" }, { status: 409 })
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return NextResponse.json({ error: "The selected product or work order does not exist" }, { status: 404 })
    }

    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}
