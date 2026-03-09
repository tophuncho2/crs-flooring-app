import { PendingLaborPaymentStatus } from "@prisma/client"
import { NextResponse } from "next/server"
import { ensureBuilderOrAdmin } from "@/lib/route-auth"
import { normalizePrismaError, parseDecimal, parseOptionalString } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"

type RouteContext = {
  params: Promise<{ id: string; paymentId: string }>
}

type PendingPaymentBody = {
  price?: string | number
  vendorId?: string
  notes?: string
  status?: string
}

function parseStatus(value: unknown): PendingLaborPaymentStatus {
  if (value === "PAID") return "PAID"
  return "PENDING"
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "jobs" })
  if (authError) return authError

  try {
    const { id: jobId, paymentId } = await params
    const body = (await request.json()) as PendingPaymentBody
    const vendorId = parseOptionalString(body.vendorId)

    if (!vendorId) {
      return NextResponse.json({ error: "vendorId is required" }, { status: 400 })
    }

    const payment = await prisma.jobPendingLaborPayment.findUnique({
      where: { id: paymentId },
      select: { id: true, jobId: true },
    })

    if (!payment || payment.jobId !== jobId) {
      return NextResponse.json({ error: "Pending labor payment not found" }, { status: 404 })
    }

    const vendor = await prisma.vendor.findUnique({ where: { id: vendorId }, select: { id: true } })
    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 })
    }

    const updated = await prisma.jobPendingLaborPayment.update({
      where: { id: paymentId },
      data: {
        vendorId,
        price: parseDecimal(body.price, "price", 2),
        notes: parseOptionalString(body.notes),
        status: parseStatus(body.status),
      },
      select: {
        id: true,
        jobId: true,
        vendorId: true,
        price: true,
        notes: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        vendor: {
          select: {
            id: true,
            companyName: true,
          },
        },
      },
    })

    return NextResponse.json({ payment: updated })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    if (normalized.status === 500 && error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "jobs" })
  if (authError) return authError

  try {
    const { id: jobId, paymentId } = await params

    const payment = await prisma.jobPendingLaborPayment.findUnique({
      where: { id: paymentId },
      select: { id: true, jobId: true },
    })

    if (!payment || payment.jobId !== jobId) {
      return NextResponse.json({ error: "Pending labor payment not found" }, { status: 404 })
    }

    await prisma.jobPendingLaborPayment.delete({ where: { id: paymentId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    if (normalized.status === 500 && error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}
