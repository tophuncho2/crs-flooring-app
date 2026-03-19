import { NextResponse } from "next/server"
import {
  canAccessBuilderPanel,
  hasSystemAccess,
} from "@/server/auth/access-control"
import { isToolUnlocked, type ToolSlug } from "@/server/platform/tool-subscriptions"
import { getSessionUser } from "@/server/auth/session"

type EnsureBuilderOrAdminOptions = {
  toolSlug?: ToolSlug
}

export async function ensureBuilderOrAdmin(options: EnsureBuilderOrAdminOptions = {}) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!hasSystemAccess(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (options.toolSlug && !(await isToolUnlocked({ userId: user.id, role: user.role, slug: options.toolSlug }))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  return null
}

export async function ensureAuthenticated() {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!hasSystemAccess(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  return null
}

export async function ensureBuilderOnly() {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (user.role !== "BUILDER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  return null
}

export async function ensureBuilderPanelAccess() {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!canAccessBuilderPanel(user.email, user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  return null
}
