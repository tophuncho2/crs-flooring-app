import { JobExpenseType } from "@prisma/client"
import { NextResponse } from "next/server"
import { ensureBuilderOrAdmin } from "@/lib/route-auth"
import { normalizePrismaError, parseDecimal, parseOptionalString } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"

type RouteContext = {
  params: Promise<{ id: string }>
}

type ExpenseBody = {
  price?: string | number
  vendorId?: string
  notes?: string
  expenseType?: string
}

function parseExpenseType(value: unknown): JobExpenseType {
  if (value === "MATERIAL") return "MATERIAL"
  return "LABOR"
}

export async function GET(_request: Request, { params }: RouteContext) {
  const authError = await ensureBuilderOrAdmin()
  if (authError) return authError

  try {
    const { id: jobId } = await params

    const expenses = await prisma.jobExpense.findMany({
      where: { jobId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        jobId: true,
        vendorId: true,
        price: true,
        notes: true,
        expenseType: true,
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

    return NextResponse.json({ expenses })
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
    const body = (await request.json()) as ExpenseBody
    const vendorId = parseOptionalString(body.vendorId)

    const job = await prisma.job.findUnique({ where: { id: jobId }, select: { id: true } })
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 })
    }

    if (vendorId) {
      const vendor = await prisma.vendor.findUnique({ where: { id: vendorId }, select: { id: true } })
      if (!vendor) {
        return NextResponse.json({ error: "Vendor not found" }, { status: 404 })
      }
    }

    const expense = await prisma.jobExpense.create({
      data: {
        jobId,
        vendorId,
        price: parseDecimal(body.price, "price", 2),
        notes: parseOptionalString(body.notes),
        expenseType: parseExpenseType(body.expenseType),
      },
      select: {
        id: true,
        jobId: true,
        vendorId: true,
        price: true,
        notes: true,
        expenseType: true,
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

    return NextResponse.json({ expense }, { status: 201 })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    if (normalized.status === 500 && error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}
