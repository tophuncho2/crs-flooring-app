import { NextResponse } from "next/server"
import { normalizePrismaError, parseOptionalString, parseRequiredString } from "@/server/http/api-helpers"
import { prisma } from "@/server/db/prisma"
import { buildManufacturerStorageName, getVisibleManufacturerAgentName, updateFlooringManufacturer } from "@/server/flooring/db-compat"
import { ensureBuilderOrAdmin } from "@/server/auth/route-auth"

type RouteContext = {
  params: Promise<{ id: string }>
}

function normalizeManufacturer(manufacturer: {
  id: string
  name: string
  companyName: string | null
  website: string | null
  phone: string | null
  email: string | null
  createdAt: Date
  updatedAt: Date
  _count?: { products: number }
}) {
  return {
    id: manufacturer.id,
    name: getVisibleManufacturerAgentName(manufacturer.name, manufacturer.companyName),
    companyName: manufacturer.companyName ?? "",
    website: manufacturer.website ?? "",
    phone: manufacturer.phone ?? "",
    email: manufacturer.email ?? "",
    productsCount: manufacturer._count?.products ?? 0,
    createdAt: manufacturer.createdAt.toISOString(),
    updatedAt: manufacturer.updatedAt.toISOString(),
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "products" })
  if (authError) return authError

  try {
    const { id } = await context.params
    const body = (await request.json()) as Record<string, unknown>
    const companyName = parseRequiredString(body.companyName, "companyName")
    const agentName = parseOptionalString(body.name)
    const manufacturer = await updateFlooringManufacturer(id, {
      name: buildManufacturerStorageName(agentName, companyName),
      companyName,
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
    await prisma.flooringManufacturer.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}
