import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  normalizePrismaError,
  parseDecimalOrDefault,
  parseOptionalString,
  parseRequiredString,
} from "@/lib/api-helpers"
import { ensureBuilderOrAdmin } from "@/lib/route-auth"

const jobStatuses = new Set([
  "FLAGGED",
  "PENDING_JOB",
  "ACTIVE_CONTRACTS",
  "AWAITING_PAYMENT",
  "PENDING_INVOICED",
  "OVERHEAD_2026",
  "COMPLETED",
])

const jobTypes = new Set(["CONSTRUCTION", "OVERHEAD_COST"])

function parseEnumValue(value: unknown, field: string, allowed: Set<string>): string {
  const raw = parseRequiredString(value, field)
  const normalized = raw.trim().toUpperCase().replace(/\s+/g, "_")
  if (!allowed.has(normalized)) {
    throw { message: `${field} must be one of ${Array.from(allowed).join(", ")}`, field }
  }
  return normalized
}

function parseOptionalEnumValue(value: unknown, allowed: Set<string>, fallback: string): string {
  if (value === undefined || value === null || String(value).trim() === "") return fallback
  return parseEnumValue(value, "jobType", allowed)
}

export async function GET() {
  const authError = await ensureBuilderOrAdmin()
  if (authError) return authError

  try {
    const jobs = await prisma.constructionJob.findMany({
      include: {
        property: { select: { id: true, name: true } },
        _count: {
          select: {
            scopes: true,
            pendingPayments: true,
            expenses: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 250,
    })

    return NextResponse.json({ jobs })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}

export async function POST(request: Request) {
  const authError = await ensureBuilderOrAdmin()
  if (authError) return authError

  try {
    const body = (await request.json()) as Record<string, unknown>

    const job = await prisma.constructionJob.create({
      data: {
        propertyId: parseOptionalString(body.propertyId),
        jobTag: parseOptionalString(body.jobTag),
        status: parseEnumValue(body.status, "status", jobStatuses) as
          | "FLAGGED"
          | "PENDING_JOB"
          | "ACTIVE_CONTRACTS"
          | "AWAITING_PAYMENT"
          | "PENDING_INVOICED"
          | "OVERHEAD_2026"
          | "COMPLETED",
        jobType: parseOptionalEnumValue(body.jobType, jobTypes, "CONSTRUCTION") as
          | "CONSTRUCTION"
          | "OVERHEAD_COST",
        startingBudget: parseDecimalOrDefault(body.startingBudget, "startingBudget", 2, "0.00"),
        revenue: parseDecimalOrDefault(body.revenue, "revenue", 2, "0.00"),
        runningBudget: parseDecimalOrDefault(body.runningBudget, "runningBudget", 2, "0.00"),
        expenseTotal: parseDecimalOrDefault(body.expenseTotal, "expenseTotal", 2, "0.00"),
        pendingExpenses: parseDecimalOrDefault(body.pendingExpenses, "pendingExpenses", 2, "0.00"),
        budgetRemaining: parseDecimalOrDefault(body.budgetRemaining, "budgetRemaining", 2, "0.00"),
        anticipatedProfit: parseDecimalOrDefault(body.anticipatedProfit, "anticipatedProfit", 2, "0.00"),
        currentProfit: parseDecimalOrDefault(body.currentProfit, "currentProfit", 2, "0.00"),
        finalProfit: parseDecimalOrDefault(body.finalProfit, "finalProfit", 2, "0.00"),
        onSiteContact: parseOptionalString(body.onSiteContact),
        onSitePhone: parseOptionalString(body.onSitePhone),
        billingInfo: parseOptionalString(body.billingInfo),
        docusketchUrl: parseOptionalString(body.docusketchUrl),
        fullJobFileUrl: parseOptionalString(body.fullJobFileUrl),
      },
    })

    return NextResponse.json({ job }, { status: 201 })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}
