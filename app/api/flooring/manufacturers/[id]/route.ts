import { NextResponse } from "next/server"
import { normalizePrismaError, parseOptionalString, parseRequiredString } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"
import { updateFlooringManufacturer } from "@/lib/flooring-db-compat"
import { ensureBuilderOrAdmin } from "@/lib/route-auth"

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
    name: manufacturer.name,
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
    const manufacturer = await updateFlooringManufacturer(id, {
      name: parseRequiredString(body.name, "name"),
      companyName: parseOptionalString(body.companyName),
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
