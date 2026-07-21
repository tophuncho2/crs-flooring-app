import { db } from "../../client.js"
import type { Prisma, PrismaClient } from "../../generated/prisma/client.js"
import {
  normalizeTemplateEntityInvolvement,
  type TemplateEntityInvolvementRow,
} from "@builders/domain"
import { entityTypeSelect } from "../../entities/read-repository.js"

type TemplatesDbClient = PrismaClient | Prisma.TransactionClient

// Shared select fragment — reused by the standalone list read below AND the
// template detail read (which embeds entity involvements as a nested array).
export const templateEntityInvolvementSelect = {
  id: true,
  entityId: true,
  // Linked entity name + type chips — read-only hydration flattened by the
  // domain normalizer (reuses the canonical entityTypeSelect fragment).
  entity: { select: { id: true, entity: true, entityType: entityTypeSelect } },
  involvementType: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
} as const

export async function listTemplateEntityInvolvements(
  templateId: string,
  client: TemplatesDbClient = db,
): Promise<TemplateEntityInvolvementRow[]> {
  const items = await client.templateEntityInvolvement.findMany({
    where: { templateId },
    select: templateEntityInvolvementSelect,
    orderBy: { createdAt: "asc" },
  })

  return items.map(normalizeTemplateEntityInvolvement)
}
