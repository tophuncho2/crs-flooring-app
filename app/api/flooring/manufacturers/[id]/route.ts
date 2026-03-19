import { NextResponse } from "next/server"
import { normalizePrismaError, parseOptionalString, parseRequiredString } from "@/server/http/api-helpers"
import { prisma } from "@/server/db/prisma"
import { ensureBuilderOrAdmin } from "@/server/auth/route-auth"
import { updateManufacturer } from "@/features/flooring/manufacturers/mutations"
import { normalizeManufacturer } from "@/features/flooring/manufacturers/services"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, context: RouteContext) {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "products" })
  if (authError) return authError

  try {
    const { id } = await context.params
    const body = (await request.json()) as Record<string, unknown>
    const companyName = parseRequiredString(body.companyName, "companyName")
    const agentName = parseOptionalString(body.agentName ?? body.name)
    const manufacturer = await updateManufacturer(id, {
      companyName,
      agentName,
      website: parseOptionalString(body.website),
      phone: parseOptionalString(body.phone),
      email: parseOptionalString(body.email),
    })

    return NextResponse.json({ manufacturer: normalizeManufacturer(manufacturer) })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "products" })
  if (authError) return authError

  try {
    const { id } = await context.params
    const linkedProducts = await prisma.flooringProduct.count({
      where: { manufacturerId: id },
    })

    if (linkedProducts > 0) {
      return NextResponse.json(
        { error: "This manufacturer has linked products and cannot be deleted" },
        { status: 409 },
      )
    }

    await prisma.flooringManufacturer.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}
