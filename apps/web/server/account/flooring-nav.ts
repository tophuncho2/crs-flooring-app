import { FLOORING_NAV_SLUGS } from "@/features/flooring/navigation/definitions"
import type { DataAccessContext } from "@/server/db/context"
import { prisma } from "@/server/db/prisma"
import { createAppError } from "@/server/http/api-helpers"

export type FlooringNavPreferencePayload = {
  visibleSlugs: string[]
  orderedSlugs: string[]
}

export function normalizeFlooringNavPreferenceInput(body: unknown): FlooringNavPreferencePayload {
  if (!body || typeof body !== "object") {
    throw createAppError("Invalid request body")
  }

  const rawVisibleSlugs = (body as { visibleSlugs?: unknown }).visibleSlugs
  const rawOrderedSlugs = (body as { orderedSlugs?: unknown }).orderedSlugs

  if (
    !Array.isArray(rawVisibleSlugs) ||
    !rawVisibleSlugs.every((slug) => typeof slug === "string") ||
    !Array.isArray(rawOrderedSlugs) ||
    !rawOrderedSlugs.every((slug) => typeof slug === "string")
  ) {
    throw createAppError("Invalid request body")
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

export async function saveUserFlooringNavPreference(
  userId: string,
  input: FlooringNavPreferencePayload,
  db: DataAccessContext = prisma,
): Promise<FlooringNavPreferencePayload> {
  const visibleSlugSet = new Set(input.visibleSlugs)
  const hiddenFlooringNavSlugs = FLOORING_NAV_SLUGS.filter((slug) => !visibleSlugSet.has(slug))

  const updatedUser = await db.user.update({
    where: { id: userId },
    data: {
      hiddenFlooringNavSlugs,
      flooringNavOrderSlugs: input.orderedSlugs,
    },
    select: { hiddenFlooringNavSlugs: true, flooringNavOrderSlugs: true },
  })

  return {
    visibleSlugs: FLOORING_NAV_SLUGS.filter((slug) => !updatedUser.hiddenFlooringNavSlugs.includes(slug)),
    orderedSlugs: updatedUser.flooringNavOrderSlugs,
  }
}
