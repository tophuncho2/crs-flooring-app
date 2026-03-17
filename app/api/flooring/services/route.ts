import { NextResponse } from "next/server"
import { ensureBuilderOrAdmin } from "@/server/auth/route-auth"
import { normalizePrismaError } from "@/server/http/api-helpers"
import { listServiceOptions } from "@/features/flooring/services/queries"

export async function GET() {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "warehouse" })
  if (authError) return authError

  try {
    return NextResponse.json({ services: await listServiceOptions() })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}
