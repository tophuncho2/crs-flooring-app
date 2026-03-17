import { NextResponse } from "next/server"
import { ensureBuilderOrAdmin } from "@/server/auth/route-auth"
import { normalizePrismaError } from "@/server/http/api-helpers"
import { syncTemplateToWorkOrder } from "@/features/flooring/work-orders/domain/syncTemplate"
import { validateSyncTemplateToWorkOrderInput } from "@/features/flooring/work-orders/validators"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: RouteContext) {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "warehouse" })
  if (authError) return authError

  try {
    const { id } = await params
    const body = (await request.json()) as Record<string, unknown>
    const result = await syncTemplateToWorkOrder(id, validateSyncTemplateToWorkOrderInput(body))
    return NextResponse.json(result)
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}
