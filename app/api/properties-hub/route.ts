import { NextResponse } from "next/server"
import { prisma } from "@/server/db/prisma"
import { normalizePrismaError, parseOptionalString, parseRequiredString } from "@/server/http/api-helpers"
import { ensureBuilderOrAdmin } from "@/server/auth/route-auth"

function normalizeAddress(value: {
  streetAddress: string | null
  city: string | null
  state: string | null
  postalCode: string | null
}) {
  return [value.streetAddress, value.city, value.state, value.postalCode].filter(Boolean).join(", ")
}

type PropertyListItem = {
  id: string
  name: string
  streetAddress: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  zip: string | null
  phone: string | null
  email: string | null
  managementCompany: {
    id: string
    name: string
  } | null
  fullAddress: string
}

function parseOptionalNullableString(value: unknown, field: string): string | null {
  if (value === null || value === undefined) {
    return null
  }
  if (typeof value !== "string") {
    throw { message: `${field} must be a string`, field }
  }

  const trimmed = value.trim()
  return trimmed === "" ? null : trimmed
}

export async function GET() {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "warehouse" })
  if (authError) return authError

  try {
    const properties = await prisma.propertyHub.findMany({
      orderBy: { createdAt: "desc" },
      take: 250,
      select: {
        id: true,
        name: true,
        streetAddress: true,
        city: true,
        state: true,
        postalCode: true,
        phone: true,
        email: true,
        flooringLinks: {
          select: {
            managementCompany: {
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

    const payload: PropertyListItem[] = properties.map((property) => ({
      id: property.id,
      name: property.name,
      streetAddress: property.streetAddress,
      city: property.city,
      state: property.state,
      postalCode: property.postalCode,
      zip: property.postalCode,
      phone: property.phone,
      email: property.email,
      managementCompany: property.flooringLinks[0]
        ? {
            id: property.flooringLinks[0].managementCompany.id,
            name: property.flooringLinks[0].managementCompany.name,
          }
        : null,
      fullAddress: normalizeAddress(property),
    }))

    return NextResponse.json({ properties: payload })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}

export async function POST(request: Request) {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "warehouse" })
  if (authError) return authError

  try {
    const body = (await request.json()) as Record<string, unknown>
    const managementCompanyId = parseOptionalNullableString(body.managementCompanyId, "managementCompanyId")

    const property = await prisma.propertyHub.create({
      data: {
        name: parseRequiredString(body.name, "name"),
        streetAddress: parseOptionalString(body.streetAddress),
        city: parseOptionalString(body.city),
        state: parseOptionalString(body.state),
        postalCode: parseOptionalString(body.postalCode),
        phone: parseOptionalString(body.phone),
        email: parseOptionalString(body.email),
        ...(managementCompanyId
          ? {
              flooringLinks: {
                create: [
                  {
                    managementCompany: {
                      connect: {
                        id: managementCompanyId,
                      },
                    },
                  },
                ],
              },
            }
          : {}),
      },
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

    return NextResponse.json(
      {
        property: {
          id: property.id,
          name: property.name,
          streetAddress: property.streetAddress,
          city: property.city,
          state: property.state,
          postalCode: property.postalCode,
          zip: property.postalCode,
          phone: property.phone,
          email: property.email,
          managementCompany: property.flooringLinks[0]
            ? {
                id: property.flooringLinks[0].managementCompany.id,
                name: property.flooringLinks[0].managementCompany.name,
              }
            : null,
          fullAddress: normalizeAddress(property),
        } satisfies PropertyListItem,
      },
      { status: 201 },
    )
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}
