import { NextResponse } from "next/server"
import { ensureBuilderOrAdmin } from "@/server/auth/route-auth"
import { normalizePrismaError } from "@/server/http/api-helpers"
import { deleteWorkOrder, updateWorkOrder } from "@/features/flooring/work-orders/mutations"
import { getWorkOrderById } from "@/features/flooring/work-orders/queries"
import { validateUpdateWorkOrderInput } from "@/features/flooring/work-orders/validators"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: RouteContext) {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "warehouse" })
  if (authError) return authError

  try {
    const { id } = await params
    return NextResponse.json({ workOrder: await getWorkOrderById(id) })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "warehouse" })
  if (authError) return authError

  try {
    const { id } = await params
    const body = (await request.json()) as Record<string, unknown>
    const workOrder = await updateWorkOrder(id, validateUpdateWorkOrderInput(body))
    return NextResponse.json({ workOrder })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "warehouse" })
  if (authError) return authError

  try {
    const { id } = await params
    await deleteWorkOrder(id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}
