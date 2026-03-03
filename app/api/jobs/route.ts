import { NextResponse } from "next/server"
import { ensureBuilderOrAdmin } from "@/lib/route-auth"
import { normalizePrismaError, parseDecimalOrDefault, parseOptionalString } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"

type JobBody = {
  name?: string
  address?: string
  propertyName?: string
  contactName?: string
  contactNumber?: string
  budget?: string | number
  assignedUserIds?: unknown
}

function parseOptionalStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []

  const normalized = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0)

  return Array.from(new Set(normalized))
}

export async function GET() {
  const authError = await ensureBuilderOrAdmin()
  if (authError) return authError

  try {
    const jobs = await prisma.job.findMany({
      orderBy: { createdAt: "desc" },
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
        assignees: {
          select: {
            user: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json({ jobs })
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
    const body = (await request.json()) as JobBody
    const assignedUserIds = parseOptionalStringArray(body.assignedUserIds)

    if (assignedUserIds.length > 0) {
      const userCount = await prisma.user.count({
        where: { id: { in: assignedUserIds } },
      })
      if (userCount !== assignedUserIds.length) {
        return NextResponse.json({ error: "One or more assigned users were not found" }, { status: 400 })
      }
    }

    const job = await prisma.job.create({
      data: {
        name: parseOptionalString(body.name) ?? "",
        address: parseOptionalString(body.address) ?? "",
        propertyName: parseOptionalString(body.propertyName) ?? "",
        contactName: parseOptionalString(body.contactName) ?? "",
        contactNumber: parseOptionalString(body.contactNumber) ?? "",
        budget: parseDecimalOrDefault(body.budget, "budget", 2, "0.00"),
        assignees:
          assignedUserIds.length > 0
            ? {
                create: assignedUserIds.map((userId) => ({ userId })),
              }
            : undefined,
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
        assignees: {
          select: {
            user: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json({ job }, { status: 201 })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    if (normalized.status === 500 && error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}
