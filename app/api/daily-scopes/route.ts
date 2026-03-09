import { NextResponse } from "next/server"
import { ensureBuilderOrAdmin } from "@/lib/route-auth"
import { normalizePrismaError, parseOptionalString } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"
import { generateAndStoreDailyScopeFile } from "@/lib/daily-scope-customer-file"

type DailyScopeRowInput = {
  room?: string
  description?: string
}

type DailyScopeBody = {
  jobId?: string
  rows?: DailyScopeRowInput[]
}

function sanitizeRows(rows: DailyScopeRowInput[] | undefined) {
  return (rows ?? [])
    .map((row) => ({
      room: typeof row.room === "string" && row.room.trim() !== "" ? row.room.trim() : "General",
      description: parseOptionalString(row.description) ?? "",
    }))
    .filter((row) => row.description !== "")
}

export async function GET() {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "daily-scope" })
  if (authError) return authError

  try {
    const dailyScopes = await prisma.dailyScope.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        jobId: true,
        jobName: true,
        address: true,
        propertyName: true,
        contactName: true,
        contactNumber: true,
        createdAt: true,
        updatedAt: true,
        customerFileName: true,
        customerFileAt: true,
        items: {
          select: {
            room: true,
            description: true,
          },
        },
      },
    })

    return NextResponse.json({ dailyScopes })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    if (normalized.status === 500 && error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}

export async function POST(request: Request) {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "daily-scope" })
  if (authError) return authError

  try {
    const body = (await request.json()) as DailyScopeBody
    const jobId = parseOptionalString(body.jobId)

    if (!jobId) {
      return NextResponse.json({ error: "jobId is required" }, { status: 400 })
    }

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        name: true,
        address: true,
        propertyName: true,
        contactName: true,
        contactNumber: true,
      },
    })

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 })
    }

    const items = sanitizeRows(body.rows)

    const scope = await prisma.dailyScope.create({
      data: {
        jobId: job.id,
        jobName: job.name,
        address: job.address,
        propertyName: job.propertyName,
        contactName: job.contactName,
        contactNumber: job.contactNumber,
        items: {
          create: items,
        },
      },
      select: { id: true },
    })

    const scopeWithFile = await generateAndStoreDailyScopeFile(scope.id)

    return NextResponse.json({ dailyScope: scopeWithFile }, { status: 201 })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    if (normalized.status === 500 && error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}
