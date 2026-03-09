import { Prisma } from "@prisma/client"
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isMasterEmail } from "@/lib/access-control"
import { prisma } from "@/lib/prisma"
import { ensureBuilderPanelAccess } from "@/lib/route-auth"
import { TOOL_CATALOG } from "@/lib/tool-subscriptions"

type ToolApiRow = {
  id: string
  slug: string
  name: string
  description: string
  path: string
  monthlyPriceCents: number
  isActive: boolean
}

type ParsedToolBody = {
  id: string
  isActive: boolean
}

function isMissingToolTableError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021"
}

function normalizeToolPayload(body: unknown): ParsedToolBody | null {
  if (!body || typeof body !== "object") return null

  const rawId = (body as { id?: unknown }).id
  const rawIsActive = (body as { isActive?: unknown }).isActive

  if (typeof rawId !== "string" || rawId.length === 0 || typeof rawIsActive !== "boolean") {
    return null
  }

  return {
    id: rawId,
    isActive: rawIsActive,
  }
}

function fallbackTools(): ToolApiRow[] {
  return TOOL_CATALOG.map((tool) => ({
    id: `${tool.slug}-fallback`,
    slug: tool.slug,
    name: tool.name,
    description: tool.description,
    path: tool.path,
    monthlyPriceCents: tool.defaultMonthlyPriceCents,
    isActive: true,
  }))
}

export async function GET() {
  const authError = await ensureBuilderPanelAccess()
  if (authError) return authError

  try {
    const tools = await prisma.tool.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        path: true,
        monthlyPriceCents: true,
        isActive: true,
      },
    })

    return NextResponse.json({ tools })
  } catch (error) {
    if (isMissingToolTableError(error)) {
      return NextResponse.json({ tools: fallbackTools() })
    }

    throw error
  }
}

export async function PATCH(request: Request) {
  const authError = await ensureBuilderPanelAccess()
  if (authError) return authError

  const session = await getServerSession(authOptions)
  if (!session?.user?.email || !isMasterEmail(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const parsedBody = normalizeToolPayload(await request.json().catch(() => null))
  if (!parsedBody) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  try {
    const updated = await prisma.tool.update({
      where: { id: parsedBody.id },
      data: { isActive: parsedBody.isActive },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        path: true,
        monthlyPriceCents: true,
        isActive: true,
      },
    })

    return NextResponse.json({ tool: updated })
  } catch (error) {
    if (isMissingToolTableError(error)) {
      return NextResponse.json(
        { error: "Billing catalog is not initialized. Please run the database migrations." },
        { status: 503 },
      )
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Tool not found" }, { status: 404 })
    }

    throw error
  }
}
