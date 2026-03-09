import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { normalizePrismaError } from "@/lib/api-helpers"
import { ensureBuilderOrAdmin } from "@/lib/route-auth"

export async function GET() {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "warehouse" })
  if (authError) return authError

  try {
    const products = await prisma.flooringProduct.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    })

    return NextResponse.json({ products })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}
