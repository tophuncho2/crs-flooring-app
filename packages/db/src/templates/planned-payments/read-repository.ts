import { db } from "../../client.js"
import type { Prisma, PrismaClient } from "../../generated/prisma/client.js"
import { normalizeTemplatePlannedPayment, type TemplatePlannedPaymentRow } from "@builders/domain"
import { entityTypesSelect } from "../../entities/read-repository.js"

type TemplatesDbClient = PrismaClient | Prisma.TransactionClient

const templatePlannedPaymentSelect = {
  id: true,
  amount: true,
  direction: true,
  notes: true,
  entityId: true,
  // Linked entity name + type chips — read-only hydration flattened by the
  // domain normalizer (reuses the canonical entityTypesSelect fragment).
  entity: { select: { id: true, entity: true, entityTypes: entityTypesSelect } },
  paymentPurposeId: true,
  // Linked purpose name + palette color — read-only hydration flattened by the
  // domain normalizer for the colored chip.
  paymentPurpose: { select: { id: true, name: true, color: true } },
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
} as const

export async function listTemplatePlannedPayments(
  templateId: string,
  client: TemplatesDbClient = db,
): Promise<TemplatePlannedPaymentRow[]> {
  const items = await client.templatePlannedPayment.findMany({
    where: { templateId },
    select: templatePlannedPaymentSelect,
    orderBy: { createdAt: "asc" },
  })

  return items.map(normalizeTemplatePlannedPayment)
}
