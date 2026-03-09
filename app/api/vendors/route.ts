import { NextResponse } from "next/server"
import { ensureBuilderOrAdmin } from "@/lib/route-auth"
import { normalizePrismaError, parseOptionalString } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"

type VendorBody = {
  companyName?: string
  phone?: string
  email?: string
}

export async function GET() {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "vendors" })
  if (authError) return authError

  try {
    const vendors = await prisma.vendor.findMany({
      orderBy: [{ companyName: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        companyName: true,
        phone: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ vendors })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    if (normalized.status === 500 && error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}

export async function POST(request: Request) {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "vendors" })
  if (authError) return authError

  try {
    const body = (await request.json()) as VendorBody
    const companyName = parseOptionalString(body.companyName)

    if (!companyName) {
      return NextResponse.json({ error: "companyName is required" }, { status: 400 })
    }

    const vendor = await prisma.vendor.create({
      data: {
        companyName,
        phone: parseOptionalString(body.phone),
        email: parseOptionalString(body.email),
      },
      select: {
        id: true,
        companyName: true,
        phone: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ vendor }, { status: 201 })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    if (normalized.status === 500 && error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}
