import { entityTypeSelect } from "../entities/read-repository.js"
import type { Prisma } from "../generated/prisma/client.js"
import type { EntityTypeRef, PaletteColor } from "@builders/domain"

// Hydration off a payment's optional links: the linked entity's name + its type
// chip, and the work order's display label. Reuses the canonical
// `entityTypeSelect` fragment so the chip matches the entities module exactly.
// Shared by the detail read AND the create/update writes so every Payment that
// leaves the data layer carries the same read-only display fields (no refetch).
export const paymentLinksInclude = {
  entity: { select: { id: true, entity: true, entityType: entityTypeSelect } },
  workOrder: {
    select: {
      id: true,
      workOrderNumber: true,
      unitType: true,
      property: { select: { name: true } },
    },
  },
  // Linked purpose name + palette color — read-only hydration flattened by
  // `projectPaymentLinks` for the colored-chip trigger. (`paymentPurposeId` is a
  // scalar column auto-returned under `include`, read straight off the row.)
  paymentPurpose: { select: { id: true, name: true, color: true } },
} as const satisfies Prisma.FlooringPaymentInclude

export type PaymentLinkRelations = {
  entity:
    | {
        entity: string
        entityType: { id: string; type: string; color: EntityTypeRef["color"] } | null
      }
    | null
  workOrder:
    | { workOrderNumber: string; unitType: string | null; property: { name: string } | null }
    | null
  paymentPurpose: { name: string; color: PaletteColor } | null
}

/** Project the included links into the flat read-only fields the normalizer reads. */
export function projectPaymentLinks(row: PaymentLinkRelations): {
  entityName: string | null
  workOrderNumber: string | null
  workOrderLabel: string | null
  entityType: EntityTypeRef | null
  paymentPurposeName: string | null
  paymentPurposeColor: PaletteColor | null
} {
  const entityType = row.entity?.entityType ?? null
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
    entityType,
    paymentPurposeName: row.paymentPurpose?.name ?? null,
    paymentPurposeColor: row.paymentPurpose?.color ?? null,
  }
}
