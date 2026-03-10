import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { canBypassVerification } from "@/lib/access-control"
import { prisma } from "@/lib/prisma"
import { FLOORING_NAV_SLUGS } from "@/app/dashboard/flooring-navigation"

function normalizeBody(body: unknown): { visibleSlugs: string[]; orderedSlugs: string[] } | null {
  if (!body || typeof body !== "object") return null

  const rawVisibleSlugs = (body as { visibleSlugs?: unknown }).visibleSlugs
  const rawOrderedSlugs = (body as { orderedSlugs?: unknown }).orderedSlugs

  if (
    !Array.isArray(rawVisibleSlugs) ||
    !rawVisibleSlugs.every((slug) => typeof slug === "string") ||
    !Array.isArray(rawOrderedSlugs) ||
    !rawOrderedSlugs.every((slug) => typeof slug === "string")
  ) {
    return null
  }

  const allowed = new Set(FLOORING_NAV_SLUGS)
  const visibleSlugs = Array.from(new Set(rawVisibleSlugs.filter((slug) => allowed.has(slug))))
  const orderedSlugs = Array.from(new Set(rawOrderedSlugs.filter((slug) => allowed.has(slug))))

  for (const slug of FLOORING_NAV_SLUGS) {
    if (!orderedSlugs.includes(slug)) {
      orderedSlugs.push(slug)
    }
  }

  return { visibleSlugs, orderedSlugs }
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, email: true, role: true, isVerified: true },
  })

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  if (!canBypassVerification(user.email, user.role) && !user.isVerified) {
    return NextResponse.json({ error: "Account restricted" }, { status: 403 })
  }

  const normalized = normalizeBody(await request.json().catch(() => null))
  if (!normalized) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const visibleSlugSet = new Set(normalized.visibleSlugs)
  const hiddenFlooringNavSlugs = FLOORING_NAV_SLUGS.filter((slug) => !visibleSlugSet.has(slug))

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      hiddenFlooringNavSlugs,
      flooringNavOrderSlugs: normalized.orderedSlugs,
    },
    select: { hiddenFlooringNavSlugs: true, flooringNavOrderSlugs: true },
  })

  return NextResponse.json({
    visibleSlugs: FLOORING_NAV_SLUGS.filter((slug) => !updatedUser.hiddenFlooringNavSlugs.includes(slug)),
    orderedSlugs: updatedUser.flooringNavOrderSlugs,
  })
}
