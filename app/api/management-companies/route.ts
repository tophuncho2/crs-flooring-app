import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { normalizePrismaError, parseOptionalString, parseRequiredString } from "@/lib/api-helpers"
import { ensureBuilderOrAdmin } from "@/lib/route-auth"

function normalizeAddress(value: {
  streetAddress: string | null
  city: string | null
  state: string | null
  postalCode: string | null
}) {
  return [value.streetAddress, value.city, value.state, value.postalCode].filter(Boolean).join(", ")
}

type ManagementCompanyListItem = {
  id: string
  name: string
  streetAddress: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  zip: string | null
  phone: string | null
  email: string | null
  fullAddress: string
  properties: Array<{
    id: string
    name: string
    fullAddress: string
  }>
}

export async function GET() {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "warehouse" })
  if (authError) return authError

  try {
    const companies = await prisma.flooringManagementCompany.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        streetAddress: true,
        city: true,
        state: true,
        postalCode: true,
        phone: true,
        email: true,
        properties: {
          select: {
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
      take: 250,
    })

    const payload = companies.map((company) => ({
      id: company.id,
      name: company.name,
      streetAddress: company.streetAddress,
      city: company.city,
      state: company.state,
      postalCode: company.postalCode,
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
    })) as ManagementCompanyListItem[]

    return NextResponse.json({ managementCompanies: payload })
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

    const company = await prisma.flooringManagementCompany.create({
      data: {
        name: parseRequiredString(body.name, "name"),
        streetAddress: parseOptionalString(body.streetAddress),
        city: parseOptionalString(body.city),
        state: parseOptionalString(body.state),
        postalCode: parseOptionalString(body.postalCode),
        phone: parseOptionalString(body.phone),
        email: parseOptionalString(body.email),
      },
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

    return NextResponse.json(
      {
        managementCompany: {
          id: company.id,
          name: company.name,
          streetAddress: company.streetAddress,
          city: company.city,
          state: company.state,
          postalCode: company.postalCode,
          zip: company.postalCode,
          phone: company.phone,
          email: company.email,
          fullAddress: normalizeAddress(company),
          properties: [],
        } satisfies ManagementCompanyListItem,
      },
      { status: 201 },
    )
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}
