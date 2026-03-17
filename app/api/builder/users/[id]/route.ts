import { NextResponse } from "next/server"
import { prisma } from "@/server/db/prisma"
import { ensureBuilderPanelAccess } from "@/server/auth/route-auth"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const authError = await ensureBuilderPanelAccess()
  if (authError) return authError

  const body = (await request.json()) as {
    role?: "ADMIN" | "BUILDER"
    isVerified?: boolean
  }

  const { id } = await params

  const existingUser = await prisma.user.findUnique({ where: { id } })
  if (!existingUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  if ("role" in body && body.role && body.role !== "ADMIN" && body.role !== "BUILDER") {
    return NextResponse.json({ error: "Role must be ADMIN or BUILDER" }, { status: 400 })
  }

  const nextRole = body.role ?? existingUser.role
  const nextIsVerifiedInput =
    typeof body.isVerified === "boolean" ? body.isVerified : existingUser.isVerified

  const updated = await prisma.user.update({
    where: { id },
    data: {
      role: nextRole,
      isVerified: nextIsVerifiedInput,
    },
    select: {
      id: true,
      email: true,
      role: true,
      isVerified: true,
      createdAt: true,
    },
  })

  return NextResponse.json({
    user: {
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      canRestrict: true,
      canEditRole: true,
    },
  })
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const authError = await ensureBuilderPanelAccess()
  if (authError) return authError

  const { id } = await params

  const existingUser = await prisma.user.findUnique({ where: { id } })

  if (!existingUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  await prisma.user.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
