import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { ensureBuilderOrAdmin } from "@/lib/route-auth"
import { normalizePrismaError, parseDecimalOrDefault, parseOptionalString } from "@/lib/api-helpers"

type RouteContext = {
  params: Promise<{ id: string }>
}

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

export async function PATCH(request: Request, { params }: RouteContext) {
  const authError = await ensureBuilderOrAdmin()
  if (authError) return authError

  try {
    const { id } = await params
    const body = (await request.json()) as EstimateBody
    const items = sanitizeRows(body.rows)

    const estimate = await prisma.estimate.update({
      where: { id },
      data: {
        propertyAddress: parseOptionalString(body.propertyAddress) ?? "",
        propertyContact: parseOptionalString(body.propertyContact) ?? "",
        unitNumber: parseOptionalString(body.unitNumber) ?? "",
        jobName: parseOptionalString(body.jobName) ?? "",
        jobAddress: parseOptionalString(body.jobAddress) ?? "",
        notes: parseOptionalString(body.notes),
        markupPercentage: parseDecimalOrDefault(body.markupPercentage, "markupPercentage", 2, "0.00"),
        items: {
          deleteMany: {},
          create: items,
        },
      },
      include: { items: true },
    })

    return NextResponse.json({ estimate })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}
