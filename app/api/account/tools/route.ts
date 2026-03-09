import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { Prisma } from "@prisma/client"
import { canBypassVerification } from "@/lib/access-control"
import { prisma } from "@/lib/prisma"
import {
  getUserToolContext,
  isKnownToolSlug,
  type ToolSlug,
} from "@/lib/tool-subscriptions"

function normalizeBody(body: unknown): {
  slug: string
  isUnlocked: boolean
} | null {
  if (!body || typeof body !== "object") return null

  const rawSlug = (body as { slug?: unknown }).slug
  const rawIsUnlocked = (body as { isUnlocked?: unknown }).isUnlocked

  if (typeof rawSlug !== "string" || typeof rawIsUnlocked !== "boolean") {
    return null
  }

  return {
    slug: rawSlug,
    isUnlocked: rawIsUnlocked,
  }
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true, isVerified: true, email: true },
  })

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  if (!canBypassVerification(user.email, user.role) && !user.isVerified) {
    return NextResponse.json({ error: "Account restricted" }, { status: 403 })
  }

  const context = await getUserToolContext({ userId: user.id, role: user.role })

  return NextResponse.json(context)
}

function isMissingToolTableError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021"
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true, isVerified: true, email: true },
  })

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  if (!canBypassVerification(user.email, user.role) && !user.isVerified) {
    return NextResponse.json({ error: "Account restricted" }, { status: 403 })
  }

  const parsedBody = normalizeBody(await request.json().catch(() => null))
  if (!parsedBody) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  if (!isKnownToolSlug(parsedBody.slug)) {
    return NextResponse.json({ error: "Unknown tool" }, { status: 400 })
  }

  let tool: { id: string; isActive: boolean } | null
  try {
    tool = await prisma.tool.findUnique({
      where: { slug: parsedBody.slug },
      select: { id: true, isActive: true },
    })
  } catch (error) {
    if (isMissingToolTableError(error)) {
      return NextResponse.json(
        { error: "Billing catalog is not initialized. Please run the database migrations." },
        { status: 503 },
      )
    }
    throw error
  }

  if (!tool || !tool.isActive) {
    return NextResponse.json({ error: "Tool is not available" }, { status: 404 })
  }

  const existing = await prisma.userToolAccess.findUnique({
    where: {
      userId_toolId: {
        userId: user.id,
        toolId: tool.id,
      },
    },
  })

  if (parsedBody.isUnlocked) {
    try {
      await prisma.userToolAccess.upsert({
        where: {
          userId_toolId: {
            userId: user.id,
            toolId: tool.id,
          },
        },
        create: {
          userId: user.id,
          toolId: tool.id,
        },
        update: {
          isActive: true,
          deactivatedAt: null,
        },
      })
    } catch (error) {
      if (isMissingToolTableError(error)) {
        return NextResponse.json(
          { error: "Billing catalog is not initialized. Please run the database migrations." },
          { status: 503 },
        )
      }
      throw error
    }
  } else if (existing) {
    try {
      await prisma.userToolAccess.update({
        where: {
          userId_toolId: {
            userId: user.id,
            toolId: tool.id,
          },
        },
        data: {
          isActive: false,
          deactivatedAt: new Date(),
        },
      })
    } catch (error) {
      if (isMissingToolTableError(error)) {
        return NextResponse.json(
          { error: "Billing catalog is not initialized. Please run the database migrations." },
          { status: 503 },
        )
      }
      throw error
    }
  }

  const context = await getUserToolContext({ userId: user.id, role: user.role })

  return NextResponse.json({
    ...context,
    changedTool: parsedBody.slug as ToolSlug,
  })
}
