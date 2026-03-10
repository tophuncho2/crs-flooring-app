import { Prisma } from "@prisma/client"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { normalizePrismaError, parseOptionalString } from "@/lib/api-helpers"
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
  managementCompany: PropertyManagementCompany | null
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

function parseOptionalNullableString(value: unknown, field: string): string | null | undefined {
  if (value === undefined) {
    return undefined
  }
  if (value === null) {
    return null
  }
  if (typeof value !== "string") {
    throw { message: `${field} must be a string`, field }
  }

  const trimmed = value.trim()
  return trimmed === "" ? null : trimmed
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
    managementCompany: property.flooringLinks[0]
      ? {
          id: property.flooringLinks[0].managementCompany.id,
          name: property.flooringLinks[0].managementCompany.name,
        }
      : null,
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

    const managementCompanyId = parseOptionalNullableString(body.managementCompanyId, "managementCompanyId")

    const hasBaseField =
      "name" in body ||
      "streetAddress" in body ||
      "city" in body ||
      "state" in body ||
      "zip" in body ||
      "phone" in body ||
      "email" in body

    if (!hasBaseField && !("managementCompanyId" in body)) {
      return NextResponse.json({ error: "No updatable fields provided" }, { status: 400 })
    }

    const data: Prisma.PropertyHubUpdateInput = {}

    if ("name" in body) {
      const name = parseOptionalString(body.name)
      if (!name) {
        return NextResponse.json({ error: "name is required" }, { status: 400 })
      }
      data.name = name
    }
    if ("streetAddress" in body) data.streetAddress = parseOptionalString(body.streetAddress)
    if ("city" in body) data.city = parseOptionalString(body.city)
    if ("state" in body) data.state = parseOptionalString(body.state)
    if ("zip" in body) data.postalCode = parseOptionalString(body.zip)
    if ("phone" in body) data.phone = parseOptionalString(body.phone)
    if ("email" in body) data.email = parseOptionalString(body.email)
    if ("managementCompanyId" in body) {
      data.flooringLinks = {
        deleteMany: { propertyId: id },
        ...(managementCompanyId
          ? {
              create: [{ managementCompany: { connect: { id: managementCompanyId } } }],
            }
          : {}),
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
