import { NextResponse } from "next/server"
import { ensureBuilderOrAdmin } from "@/lib/route-auth"
import { normalizePrismaError, parseOptionalString } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"

type RouteContext = {
  params: Promise<{ id: string }>
}

type VendorBody = {
  companyName?: string
  phone?: string
  email?: string
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "vendors" })
  if (authError) return authError

  try {
    const { id } = await params
    const body = (await request.json()) as VendorBody
    const companyName = parseOptionalString(body.companyName)

    if (!companyName) {
      return NextResponse.json({ error: "companyName is required" }, { status: 400 })
    }

    const vendor = await prisma.vendor.update({
      where: { id },
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

    return NextResponse.json({ vendor })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    if (normalized.status === 500 && error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "vendors" })
  if (authError) return authError

  try {
    const { id } = await params
    await prisma.vendor.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    if (normalized.status === 500 && error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}
