import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { canEditRole, canRestrictUser, isMasterEmail } from "@/lib/access-control"
import { ensureBuilderOnly } from "@/lib/route-auth"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const authError = await ensureBuilderOnly()
  if (authError) return authError

  const body = (await request.json()) as {
    role?: "CONTRACTOR" | "ADMIN" | "BUILDER"
    isVerified?: boolean
  }

  const { id } = await params

  const existingUser = await prisma.user.findUnique({ where: { id } })
  if (!existingUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  if ("role" in body && body.role && !canEditRole(existingUser.email, existingUser.role)) {
    return NextResponse.json({ error: "Role for this account cannot be changed" }, { status: 400 })
  }

  if ("isVerified" in body && typeof body.isVerified === "boolean") {
    if (body.isVerified === false && !canRestrictUser(existingUser.email, existingUser.role)) {
      return NextResponse.json(
        { error: "This account cannot be restricted" },
        { status: 400 },
      )
    }
  }

  const nextRole = body.role ?? existingUser.role
  const nextIsVerifiedInput =
    typeof body.isVerified === "boolean" ? body.isVerified : existingUser.isVerified

  const nextIsVerified =
    nextRole === "BUILDER" || isMasterEmail(existingUser.email)
      ? true
      : nextIsVerifiedInput

  const updated = await prisma.user.update({
    where: { id },
    data: {
      role: nextRole,
      isVerified: nextIsVerified,
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
      isMaster: isMasterEmail(updated.email),
      canRestrict: canRestrictUser(updated.email, updated.role),
      canEditRole: canEditRole(updated.email, updated.role),
    },
  })
}
