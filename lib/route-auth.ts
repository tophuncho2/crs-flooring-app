import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { canBypassVerification } from "@/lib/access-control"

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

export async function ensureBuilderOrAdmin() {
  const { session, user } = await getCurrentUserRecord()
  if (!session || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (user.role !== "BUILDER" && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (!canBypassVerification(user.email, user.role) && !user.isVerified) {
    return NextResponse.json({ error: "Account restricted" }, { status: 403 })
  }

  return null
}

export async function ensureAuthenticated() {
  const { session, user } = await getCurrentUserRecord()
  if (!session || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!canBypassVerification(user.email, user.role) && !user.isVerified) {
    return NextResponse.json({ error: "Account restricted" }, { status: 403 })
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
