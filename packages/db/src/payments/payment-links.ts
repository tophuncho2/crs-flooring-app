import { entityTypesSelect } from "../entities/read-repository.js"
import type { Prisma } from "../generated/prisma/client.js"
import type { EntityTypeRef } from "@builders/domain"

// Hydration off a payment's optional links: the linked entity's name + its type
// chips, and the work order's display label. Reuses the canonical
// `entityTypesSelect` fragment so the chips match the entities module exactly.
// Shared by the detail read AND the create/update writes so every Payment that
// leaves the data layer carries the same read-only display fields (no refetch).
export const paymentLinksInclude = {
  entity: { select: { id: true, entity: true, entityTypes: entityTypesSelect } },
  workOrder: {
    select: {
      id: true,
      workOrderNumber: true,
      unitType: true,
      property: { select: { name: true } },
    },
  },
} as const satisfies Prisma.FlooringPaymentInclude

export type PaymentLinkRelations = {
  entity:
    | {
        entity: string
        entityTypes: { entityType: { id: string; type: string; color: EntityTypeRef["color"] } }[]
      }
    | null
  workOrder:
    | { workOrderNumber: string; unitType: string | null; property: { name: string } | null }
    | null
}

/** Project the included links into the flat read-only fields the normalizer reads. */
export function projectPaymentLinks(row: PaymentLinkRelations): {
  entityName: string | null
  workOrderNumber: string | null
  workOrderLabel: string | null
  entityTypes: EntityTypeRef[]
} {
  const entityTypes = (row.entity?.entityTypes ?? []).map((link) => ({
    id: link.entityType.id,
    type: link.entityType.type,
    color: link.entityType.color,
  }))
  const workOrder = row.workOrder
  const workOrderLabel = workOrder
    ? [`#${workOrder.workOrderNumber}`, workOrder.property?.name, workOrder.unitType]
        .filter((part): part is string => Boolean(part && part.length > 0))
        .join(" · ")
    : null
  return {
    entityName: row.entity?.entity ?? null,
    workOrderNumber: workOrder?.workOrderNumber ?? null,
    workOrderLabel,
    entityTypes,
  }
}
