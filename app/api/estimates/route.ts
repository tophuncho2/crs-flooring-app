import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { ensureBuilderOrAdmin } from "@/lib/route-auth"
import { generateAndStoreCustomerEstimateFile } from "@/lib/estimate-customer-file"
import { normalizePrismaError, parseDecimalOrDefault, parseOptionalString } from "@/lib/api-helpers"

type EstimateRowInput = {
  room?: string
  productId?: string
  quantity?: number | string
  unitOfMeasure?: string
  measureUnit?: string
}

type EstimateBody = {
  propertyAddress?: string
  propertyContact?: string
  unitNumber?: string
  jobName?: string
  jobAddress?: string
  notes?: string
  markupPercentage?: string | number
  rows?: EstimateRowInput[]
}

function sanitizeRows(rows: EstimateRowInput[] | undefined) {
  return (rows ?? [])
    .filter((row) => typeof row.productId === "string" && row.productId.trim() !== "")
    .map((row) => ({
      room: typeof row.room === "string" && row.room.trim() !== "" ? row.room.trim() : "General",
      productId: (row.productId as string).trim(),
      quantity: parseDecimalOrDefault(row.quantity, "quantity", 2, "0.00"),
      unitOfMeasure:
        typeof row.unitOfMeasure === "string" && row.unitOfMeasure.trim() !== "" ? row.unitOfMeasure.trim() : "unit",
      altUnitOfMeasure: parseOptionalString(row.measureUnit),
    }))
}

export async function GET() {
  const authError = await ensureBuilderOrAdmin()
  if (authError) return authError

  try {
    const estimates = await prisma.estimate.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        propertyAddress: true,
        propertyContact: true,
        unitNumber: true,
        jobName: true,
        jobAddress: true,
        notes: true,
        markupPercentage: true,
        createdAt: true,
        updatedAt: true,
        customerFileName: true,
        customerFileAt: true,
        items: {
          select: {
            room: true,
            productId: true,
            quantity: true,
            unitOfMeasure: true,
            altUnitOfMeasure: true,
          },
        },
      },
    })

    return NextResponse.json({ estimates })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    if (normalized.status === 500 && error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}

export async function POST(request: Request) {
  const authError = await ensureBuilderOrAdmin()
  if (authError) return authError

  try {
    const body = (await request.json()) as EstimateBody
    const items = sanitizeRows(body.rows)

    const estimate = await prisma.estimate.create({
      data: {
        propertyAddress: parseOptionalString(body.propertyAddress) ?? "",
        propertyContact: parseOptionalString(body.propertyContact) ?? "",
        unitNumber: parseOptionalString(body.unitNumber) ?? "",
        jobName: parseOptionalString(body.jobName) ?? "",
        jobAddress: parseOptionalString(body.jobAddress) ?? "",
        notes: parseOptionalString(body.notes),
        markupPercentage: parseDecimalOrDefault(body.markupPercentage, "markupPercentage", 2, "0.00"),
        items: {
          create: items,
        },
      },
      select: { id: true },
    })

    const estimateWithFile = await generateAndStoreCustomerEstimateFile(estimate.id)

    return NextResponse.json({ estimate: estimateWithFile }, { status: 201 })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    if (normalized.status === 500 && error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}
