import { db } from "../../client.js"
import type { Prisma, PrismaClient } from "../../generated/prisma/client.js"
import { normalizeTemplateCommission, type TemplateCommissionRow } from "@builders/domain"
import { entityTypeSelect } from "../../entities/read-repository.js"

type TemplatesDbClient = PrismaClient | Prisma.TransactionClient

// Shared select fragment — reused by the standalone list read below AND the
// template detail read (which embeds commissions as a nested array). Uses the
// canonical shared fragment (NOT an inline select), so a new commission column is
// added in exactly one place.
export const templateCommissionSelect = {
  id: true,
  entityId: true,
  // Linked entity name + type chip — read-only hydration flattened by the domain
  // normalizer (reuses the canonical entityTypeSelect fragment).
  entity: { select: { id: true, entity: true, entityType: entityTypeSelect } },
  percent: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
} as const

export async function listTemplateCommissions(
  templateId: string,
  client: TemplatesDbClient = db,
): Promise<TemplateCommissionRow[]> {
  const items = await client.templateCommission.findMany({
    where: { templateId },
    select: templateCommissionSelect,
    orderBy: { createdAt: "asc" },
  })

  return items.map(normalizeTemplateCommission)
}
