import { NextResponse } from "next/server"
import { ensureBuilderOrAdmin } from "@/lib/route-auth"
import { normalizePrismaError, parseDecimalOrDefault, parseOptionalString } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"
import { generateAndStoreCustomerInvoiceFile } from "@/lib/invoice-customer-file"

type InvoiceLineInput = {
  description?: string
  price?: number | string
}

type InvoiceBody = {
  propertyAddress?: string
  propertyContact?: string
  unitNumber?: string
  jobName?: string
  jobAddress?: string
  notes?: string
  totalCost?: number | string
  rows?: InvoiceLineInput[]
}

function sanitizeRows(rows: InvoiceLineInput[] | undefined) {
  return (rows ?? [])
    .map((row) => ({
      description: typeof row.description === "string" && row.description.trim() !== "" ? row.description.trim() : "Labor",
      price: parseDecimalOrDefault(row.price, "price", 2, "0.00"),
    }))
    .filter((row) => row.description !== "" || Number(row.price) !== 0)
}

function calculateTotal(rows: Array<{ price: unknown }>, requestedTotal: unknown): ReturnType<typeof parseDecimalOrDefault> {
  const parsedRequestedTotal = parseDecimalOrDefault(requestedTotal, "totalCost", 2, "0.00")
  const computedTotal = rows.reduce((sum, row) => sum + Number(row.price), 0)

  if (Number(parsedRequestedTotal) === 0 && computedTotal > 0) {
    return parseDecimalOrDefault(computedTotal, "totalCost", 2, "0.00")
  }

  return parsedRequestedTotal
}

export async function GET() {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "invoices" })
  if (authError) return authError

  try {
    const invoices = await prisma.invoice.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        propertyAddress: true,
        propertyContact: true,
        unitNumber: true,
        jobName: true,
        jobAddress: true,
        notes: true,
        totalCost: true,
        createdAt: true,
        updatedAt: true,
        customerFileName: true,
        customerFileAt: true,
        items: {
          select: {
            description: true,
            price: true,
          },
        },
      },
    })

    return NextResponse.json({ invoices })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    if (normalized.status === 500 && error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}

export async function POST(request: Request) {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "invoices" })
  if (authError) return authError

  try {
    const body = (await request.json()) as InvoiceBody
    const items = sanitizeRows(body.rows)

    const invoice = await prisma.invoice.create({
      data: {
        propertyAddress: parseOptionalString(body.propertyAddress) ?? "",
        propertyContact: parseOptionalString(body.propertyContact) ?? "",
        unitNumber: parseOptionalString(body.unitNumber) ?? "",
        jobName: parseOptionalString(body.jobName) ?? "",
        jobAddress: parseOptionalString(body.jobAddress) ?? "",
        notes: parseOptionalString(body.notes),
        totalCost: calculateTotal(items, body.totalCost),
        items: {
          create: items,
        },
      },
      select: { id: true },
    })

    const invoiceWithFile = await generateAndStoreCustomerInvoiceFile(invoice.id)

    return NextResponse.json({ invoice: invoiceWithFile }, { status: 201 })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    if (normalized.status === 500 && error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}
