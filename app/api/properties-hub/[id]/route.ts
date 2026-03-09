import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { normalizePrismaError, parseOptionalString, parseRequiredString } from "@/lib/api-helpers"
import { ensureBuilderOrAdmin } from "@/lib/route-auth"

type RouteContext = {
  params: Promise<{ id: string }>
}

type PropertyManagementCompany = {
  id: string
  name: string
}

type PropertyPayload = {
  id: string
  name: string
  streetAddress: string | null
  city: string | null
  state: string | null
  zip: string | null
  phone: string | null
  email: string | null
  managementCompanies: PropertyManagementCompany[]
  fullAddress: string
}

function normalizeAddress(value: {
  streetAddress: string | null
  city: string | null
  state: string | null
  postalCode: string | null
}) {
  return [value.streetAddress, value.city, value.state, value.postalCode].filter(Boolean).join(", ")
}

function parseOptionalStringArray(value: unknown, field: string): string[] {
  if (value === undefined) {
    return []
  }
  if (!Array.isArray(value)) {
    throw { message: `${field} must be an array`, field }
  }

  const parsed = value.map((item) => parseRequiredString(item, `${field} item`))
  return Array.from(new Set(parsed))
}

function normalizeResponse(property: {
  id: string
  name: string
  streetAddress: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  phone: string | null
  email: string | null
  flooringLinks: Array<{ managementCompany: { id: string; name: string } }>
}): PropertyPayload {
  return {
    id: property.id,
    name: property.name,
    streetAddress: property.streetAddress,
    city: property.city,
    state: property.state,
    zip: property.postalCode,
    phone: property.phone,
    email: property.email,
    managementCompanies: property.flooringLinks.map((link) => ({ id: link.managementCompany.id, name: link.managementCompany.name })),
    fullAddress: normalizeAddress({
      streetAddress: property.streetAddress,
      city: property.city,
      state: property.state,
      postalCode: property.postalCode,
    }),
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "warehouse" })
  if (authError) return authError

  try {
    const { id } = await params
    const body = (await request.json()) as Record<string, unknown>

    const updatePayload = {
      name: parseOptionalString(body.name),
      streetAddress: parseOptionalString(body.streetAddress),
      city: parseOptionalString(body.city),
      state: parseOptionalString(body.state),
      postalCode: parseOptionalString(body.zip),
      phone: parseOptionalString(body.phone),
      email: parseOptionalString(body.email),
    }

    if (Object.values(updatePayload).every((value) => value === null) && !("managementCompanyIds" in body)) {
      return NextResponse.json({ error: "No updatable fields provided" }, { status: 400 })
    }

    const data: {
      name?: string | null
      streetAddress?: string | null
      city?: string | null
      state?: string | null
      postalCode?: string | null
      phone?: string | null
      email?: string | null
      flooringLinks?: { deleteMany: { propertyId: string }; create: { managementCompanyId: string }[] }
    } = {}

    if (updatePayload.name !== null) data.name = updatePayload.name
    if (updatePayload.streetAddress !== null) data.streetAddress = updatePayload.streetAddress
    if (updatePayload.city !== null) data.city = updatePayload.city
    if (updatePayload.state !== null) data.state = updatePayload.state
    if (updatePayload.postalCode !== null) data.postalCode = updatePayload.postalCode
    if (updatePayload.phone !== null) data.phone = updatePayload.phone
    if (updatePayload.email !== null) data.email = updatePayload.email
    if ("managementCompanyIds" in body) {
      const ids = parseOptionalStringArray(body.managementCompanyIds, "managementCompanyIds").map((managementCompanyId) => ({ managementCompanyId }))
      data.flooringLinks = {
        deleteMany: { propertyId: id },
        create: ids,
      }
    }

    const property = await prisma.propertyHub.update({
      where: { id },
      data,
      include: {
        flooringLinks: {
          include: {
            managementCompany: {
              select: { id: true, name: true },
            },
          },
        },
      },
    })

    return NextResponse.json({ property: normalizeResponse(property) })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "warehouse" })
  if (authError) return authError

  try {
    const { id } = await params
    await prisma.propertyHub.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}

export async function GET(_request: Request, { params }: RouteContext) {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "warehouse" })
  if (authError) return authError

  try {
    const { id } = await params
    const property = await prisma.propertyHub.findUniqueOrThrow({
      where: { id },
      include: {
        flooringLinks: {
          include: {
            managementCompany: { select: { id: true, name: true } },
          },
        },
      },
    })

    return NextResponse.json({ property: normalizeResponse(property) })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}
