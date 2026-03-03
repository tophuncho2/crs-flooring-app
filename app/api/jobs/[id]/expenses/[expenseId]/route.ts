import { JobExpenseType } from "@prisma/client"
import { NextResponse } from "next/server"
import { ensureBuilderOrAdmin } from "@/lib/route-auth"
import { normalizePrismaError, parseDecimal, parseOptionalString } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"

type RouteContext = {
  params: Promise<{ id: string; expenseId: string }>
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

export async function PATCH(request: Request, { params }: RouteContext) {
  const authError = await ensureBuilderOrAdmin()
  if (authError) return authError

  try {
    const { id: jobId, expenseId } = await params
    const body = (await request.json()) as ExpenseBody
    const vendorId = parseOptionalString(body.vendorId)

    const expense = await prisma.jobExpense.findUnique({
      where: { id: expenseId },
      select: { id: true, jobId: true },
    })

    if (!expense || expense.jobId !== jobId) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 })
    }

    if (vendorId) {
      const vendor = await prisma.vendor.findUnique({ where: { id: vendorId }, select: { id: true } })
      if (!vendor) {
        return NextResponse.json({ error: "Vendor not found" }, { status: 404 })
      }
    }

    const updated = await prisma.jobExpense.update({
      where: { id: expenseId },
      data: {
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

    return NextResponse.json({ expense: updated })
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
    const { id: jobId, expenseId } = await params

    const expense = await prisma.jobExpense.findUnique({
      where: { id: expenseId },
      select: { id: true, jobId: true },
    })

    if (!expense || expense.jobId !== jobId) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 })
    }

    await prisma.jobExpense.delete({ where: { id: expenseId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    if (normalized.status === 500 && error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}
