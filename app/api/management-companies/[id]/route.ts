import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { normalizePrismaError, parseOptionalString, parseRequiredString } from "@/lib/api-helpers"
import { ensureBuilderOrAdmin } from "@/lib/route-auth"

type RouteContext = {
  params: Promise<{ id: string }>
}

type ManagementPayload = {
  id: string
  name: string
  streetAddress: string | null
  city: string | null
  state: string | null
  zip: string | null
  phone: string | null
  email: string | null
  fullAddress: string
  properties: Array<{ id: string; name: string; fullAddress: string }>
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

function normalizeResponse(company: {
  id: string
  name: string
  streetAddress: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  phone: string | null
  email: string | null
  properties: Array<{ property: { id: string; name: string; streetAddress: string | null; city: string | null; state: string | null; postalCode: string | null } }>
}): ManagementPayload {
  return {
    id: company.id,
    name: company.name,
    streetAddress: company.streetAddress,
    city: company.city,
    state: company.state,
    zip: company.postalCode,
    phone: company.phone,
    email: company.email,
    fullAddress: normalizeAddress({
      streetAddress: company.streetAddress,
      city: company.city,
      state: company.state,
      postalCode: company.postalCode,
    }),
    properties: company.properties.map((link) => ({
      id: link.property.id,
      name: link.property.name,
      fullAddress: normalizeAddress({
        streetAddress: link.property.streetAddress,
        city: link.property.city,
        state: link.property.state,
        postalCode: link.property.postalCode,
      }),
    })),
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

    if (Object.values(updatePayload).every((value) => value === null) && !("propertyIds" in body)) {
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
      properties?: { deleteMany: { managementCompanyId: string }; create: { propertyId: string }[] }
    } = {}

    if (updatePayload.name !== null) data.name = updatePayload.name
    if (updatePayload.streetAddress !== null) data.streetAddress = updatePayload.streetAddress
    if (updatePayload.city !== null) data.city = updatePayload.city
    if (updatePayload.state !== null) data.state = updatePayload.state
    if (updatePayload.postalCode !== null) data.postalCode = updatePayload.postalCode
    if (updatePayload.phone !== null) data.phone = updatePayload.phone
    if (updatePayload.email !== null) data.email = updatePayload.email

    if ("propertyIds" in body) {
      const ids = parseOptionalStringArray(body.propertyIds, "propertyIds").map((propertyId) => ({ propertyId }))
      data.properties = {
        deleteMany: { managementCompanyId: id },
        create: ids,
      }
    }

    const company = await prisma.flooringManagementCompany.update({
      where: { id },
      data,
      include: {
        properties: {
          include: {
            property: {
              select: {
                id: true,
                name: true,
                streetAddress: true,
                city: true,
                state: true,
                postalCode: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json({ managementCompany: normalizeResponse(company) })
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
    await prisma.flooringManagementCompany.delete({ where: { id } })
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
    const company = await prisma.flooringManagementCompany.findUniqueOrThrow({
      where: { id },
      include: {
        properties: {
          include: { property: { select: { id: true, name: true, streetAddress: true, city: true, state: true, postalCode: true } } },
        },
      },
    })

    return NextResponse.json({ managementCompany: normalizeResponse(company) })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}
