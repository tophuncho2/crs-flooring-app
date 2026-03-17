import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/server/auth/auth-options"
import { prisma } from "@/server/db/prisma"
import {
  canAccessBuilderPanel,
  hasSystemAccess,
} from "@/server/auth/access-control"
import type { ToolSlug } from "@/server/platform/tool-subscriptions"

async function getCurrentUserRecord() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    return { session: null, user: null }
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, email: true, role: true, isVerified: true },
  })

  return { session, user }
}

type EnsureBuilderOrAdminOptions = {
  toolSlug?: ToolSlug
}

export async function ensureBuilderOrAdmin(options: EnsureBuilderOrAdminOptions = {}) {
  const { session, user } = await getCurrentUserRecord()
  if (!session || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  void options
  if (hasSystemAccess(user.role)) {
    return null
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}

export async function ensureAuthenticated() {
  const { session, user } = await getCurrentUserRecord()
  if (!session || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!hasSystemAccess(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  return null
}

export async function ensureBuilderOnly() {
  const { session, user } = await getCurrentUserRecord()
  if (!session || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (user.role !== "BUILDER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  return null
}

export async function ensureBuilderPanelAccess() {
  const { session, user } = await getCurrentUserRecord()
  if (!session || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!canAccessBuilderPanel(user.email, user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  return null
}
