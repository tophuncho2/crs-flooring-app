import { NextResponse } from "next/server"
import { ensureBuilderOrAdmin } from "@/server/auth/route-auth"
import { normalizePrismaError } from "@/server/http/api-helpers"
import { createWorkOrder } from "@/features/flooring/work-orders/mutations"
import { listWorkOrders } from "@/features/flooring/work-orders/queries"
import { validateCreateWorkOrderInput } from "@/features/flooring/work-orders/validators"

export async function GET() {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "warehouse" })
  if (authError) return authError

  try {
    return NextResponse.json({ workOrders: await listWorkOrders() })
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
    const workOrder = await createWorkOrder(validateCreateWorkOrderInput(body))
    return NextResponse.json({ workOrder }, { status: 201 })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}
