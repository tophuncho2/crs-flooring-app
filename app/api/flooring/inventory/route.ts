import { NextResponse } from "next/server"
import { ensureBuilderOrAdmin } from "@/lib/route-auth"

function removedResponse() {
  return NextResponse.json({ error: "Inventory module has been removed" }, { status: 410 })
}

export async function GET() {
  const authError = await ensureBuilderOrAdmin()
  if (authError) return authError
  return removedResponse()
}

export async function POST() {
  const authError = await ensureBuilderOrAdmin()
  if (authError) return authError
  return removedResponse()
}
