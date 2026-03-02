import { NextResponse } from "next/server"
import { ensureBuilderOrAdmin } from "@/lib/route-auth"
import { normalizePrismaError, parseDecimalOrDefault, parseOptionalString } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"

type RouteContext = {
  params: Promise<{ id: string }>
}

type JobBody = {
  name?: string
  address?: string
  propertyName?: string
  contactName?: string
  contactNumber?: string
  budget?: string | number
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const authError = await ensureBuilderOrAdmin()
  if (authError) return authError

  try {
    const { id } = await params
    const body = (await request.json()) as JobBody

    const job = await prisma.job.update({
      where: { id },
      data: {
        name: parseOptionalString(body.name) ?? "",
        address: parseOptionalString(body.address) ?? "",
        propertyName: parseOptionalString(body.propertyName) ?? "",
        contactName: parseOptionalString(body.contactName) ?? "",
        contactNumber: parseOptionalString(body.contactNumber) ?? "",
        budget: parseDecimalOrDefault(body.budget, "budget", 2, "0.00"),
      },
      select: {
        id: true,
        name: true,
        address: true,
        propertyName: true,
        contactName: true,
        contactNumber: true,
        budget: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ job })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    if (normalized.status === 500 && error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const authError = await ensureBuilderOrAdmin()
  if (authError) return authError

  try {
    const { id } = await params
    await prisma.job.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    if (normalized.status === 500 && error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}
