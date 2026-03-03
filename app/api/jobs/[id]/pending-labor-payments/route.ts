import { PendingLaborPaymentStatus } from "@prisma/client"
import { NextResponse } from "next/server"
import { ensureBuilderOrAdmin } from "@/lib/route-auth"
import { normalizePrismaError, parseDecimal, parseOptionalString } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"

type RouteContext = {
  params: Promise<{ id: string }>
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

export async function GET(_request: Request, { params }: RouteContext) {
  const authError = await ensureBuilderOrAdmin()
  if (authError) return authError

  try {
    const { id: jobId } = await params

    const payments = await prisma.jobPendingLaborPayment.findMany({
      where: { jobId },
      orderBy: { createdAt: "desc" },
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

    return NextResponse.json({ payments })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    if (normalized.status === 500 && error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  const authError = await ensureBuilderOrAdmin()
  if (authError) return authError

  try {
    const { id: jobId } = await params
    const body = (await request.json()) as PendingPaymentBody

    const vendorId = parseOptionalString(body.vendorId)
    if (!vendorId) {
      return NextResponse.json({ error: "vendorId is required" }, { status: 400 })
    }

    const [job, vendor] = await Promise.all([
      prisma.job.findUnique({ where: { id: jobId }, select: { id: true } }),
      prisma.vendor.findUnique({ where: { id: vendorId }, select: { id: true } }),
    ])

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 })
    }
    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 })
    }

    const payment = await prisma.jobPendingLaborPayment.create({
      data: {
        jobId,
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

    return NextResponse.json({ payment }, { status: 201 })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    if (normalized.status === 500 && error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}
