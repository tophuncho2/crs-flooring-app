import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { normalizePrismaError, parseOptionalString, parseRequiredString } from "@/lib/api-helpers"
import { ensureBuilderOrAdmin } from "@/lib/route-auth"

export async function GET() {
  const authError = await ensureBuilderOrAdmin()
  if (authError) return authError

  try {
    const properties = await prisma.propertyHub.findMany({
      orderBy: { createdAt: "desc" },
      take: 250,
    })

    return NextResponse.json({ properties })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}

export async function POST(request: Request) {
  const authError = await ensureBuilderOrAdmin()
  if (authError) return authError

  try {
    const body = (await request.json()) as Record<string, unknown>

    const property = await prisma.propertyHub.create({
      data: {
        name: parseRequiredString(body.name, "name"),
        streetAddress: parseOptionalString(body.streetAddress),
        city: parseOptionalString(body.city),
        state: parseOptionalString(body.state),
        postalCode: parseOptionalString(body.postalCode),
        phone: parseOptionalString(body.phone),
        email: parseOptionalString(body.email),
      },
    })

    return NextResponse.json({ property }, { status: 201 })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}
