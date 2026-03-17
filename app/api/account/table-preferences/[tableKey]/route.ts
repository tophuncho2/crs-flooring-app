import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/server/auth/auth-options"
import { canBypassVerification } from "@/server/auth/access-control"
import { prisma } from "@/server/db/prisma"

function normalizeBody(body: unknown) {
  if (!body || typeof body !== "object") return null

  const rawHiddenColumnKeys = (body as { hiddenColumnKeys?: unknown }).hiddenColumnKeys
  const rawColumnOrderKeys = (body as { columnOrderKeys?: unknown }).columnOrderKeys
  const rawAllowedColumnKeys = (body as { allowedColumnKeys?: unknown }).allowedColumnKeys

  if (
    !Array.isArray(rawHiddenColumnKeys) ||
    !rawHiddenColumnKeys.every((key) => typeof key === "string") ||
    !Array.isArray(rawColumnOrderKeys) ||
    !rawColumnOrderKeys.every((key) => typeof key === "string") ||
    !Array.isArray(rawAllowedColumnKeys) ||
    !rawAllowedColumnKeys.every((key) => typeof key === "string")
  ) {
    return null
  }

  const allowedColumnKeys = Array.from(new Set(rawAllowedColumnKeys))
  const allowedSet = new Set(allowedColumnKeys)
  const hiddenColumnKeys = Array.from(new Set(rawHiddenColumnKeys.filter((key) => allowedSet.has(key))))
  const columnOrderKeys = Array.from(new Set(rawColumnOrderKeys.filter((key) => allowedSet.has(key))))

  for (const key of allowedColumnKeys) {
    if (!columnOrderKeys.includes(key)) {
      columnOrderKeys.push(key)
    }
  }

  return { hiddenColumnKeys, columnOrderKeys, allowedColumnKeys }
}

async function getCurrentUser() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return null
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, email: true, role: true, isVerified: true },
  })

  if (!user) return null
  if (!canBypassVerification(user.email, user.role) && !user.isVerified) {
    return "forbidden" as const
  }

  return user
}

export async function GET(_: Request, context: { params: Promise<{ tableKey: string }> }) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (user === "forbidden") {
    return NextResponse.json({ error: "Account restricted" }, { status: 403 })
  }

  const { tableKey } = await context.params
  const preference = await prisma.userTablePreference.findUnique({
    where: {
      userId_tableKey: {
        userId: user.id,
        tableKey,
      },
    },
    select: {
      hiddenColumnKeys: true,
      columnOrderKeys: true,
    },
  })

  return NextResponse.json({
    hiddenColumnKeys: preference?.hiddenColumnKeys ?? [],
    columnOrderKeys: preference?.columnOrderKeys ?? [],
  })
}

export async function PATCH(request: Request, context: { params: Promise<{ tableKey: string }> }) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (user === "forbidden") {
    return NextResponse.json({ error: "Account restricted" }, { status: 403 })
  }

  const { tableKey } = await context.params
  const normalized = normalizeBody(await request.json().catch(() => null))
  if (!normalized) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const preference = await prisma.userTablePreference.upsert({
    where: {
      userId_tableKey: {
        userId: user.id,
        tableKey,
      },
    },
    update: {
      hiddenColumnKeys: normalized.hiddenColumnKeys,
      columnOrderKeys: normalized.columnOrderKeys,
    },
    create: {
      userId: user.id,
      tableKey,
      hiddenColumnKeys: normalized.hiddenColumnKeys,
      columnOrderKeys: normalized.columnOrderKeys,
    },
    select: {
      hiddenColumnKeys: true,
      columnOrderKeys: true,
    },
  })

  return NextResponse.json(preference)
}
