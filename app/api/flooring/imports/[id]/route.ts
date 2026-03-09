import { NextResponse } from "next/server"
import { ensureBuilderOrAdmin } from "@/lib/route-auth"

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, context: RouteContext) {
  void request
  void context
  const authError = await ensureBuilderOrAdmin({ toolSlug: "warehouse" })
  if (authError) return authError
  return NextResponse.json({ error: "Imports module has been removed" }, { status: 410 })
}
