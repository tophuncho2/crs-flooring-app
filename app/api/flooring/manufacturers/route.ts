import { NextResponse } from "next/server"
import { normalizePrismaError, parseOptionalString, parseRequiredString } from "@/lib/api-helpers"
import { createFlooringManufacturer, findFlooringManufacturers } from "@/lib/flooring-db-compat"
import { ensureBuilderOrAdmin } from "@/lib/route-auth"

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

export async function GET() {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "products" })
  if (authError) return authError

  try {
    const manufacturers = await findFlooringManufacturers()

    return NextResponse.json({ manufacturers: manufacturers.map(normalizeManufacturer) })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}

export async function POST(request: Request) {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "products" })
  if (authError) return authError

  try {
    const body = (await request.json()) as Record<string, unknown>
    const manufacturer = await createFlooringManufacturer({
      name: parseRequiredString(body.name, "name"),
      companyName: parseOptionalString(body.companyName),
      website: parseOptionalString(body.website),
      phone: parseOptionalString(body.phone),
      email: parseOptionalString(body.email),
    })

    return NextResponse.json({ manufacturer: normalizeManufacturer(manufacturer) }, { status: 201 })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}
