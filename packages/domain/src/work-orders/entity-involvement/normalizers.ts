import { toIsoTimestamp } from "../../shared/date-format.js"
import type { PaletteColor } from "../../shared/palette.js"
import type { WorkOrderEntityInvolvementRow } from "./types.js"

type WorkOrderEntityInvolvementInput = {
  id: string
  entityId: string | null
  // Nested entity relation (from `entityTypeSelect` in the data layer); flattened
  // here to entityName + entityType. Absent/null on unlinked rows.
  entity?: {
    entity: string
    entityType: { id: string; type: string; color: PaletteColor } | null
  } | null
  involvementType: string | null
  createdAt: Date | string
  updatedAt: Date | string
  createdBy: string | null
  updatedBy: string | null
}

export function normalizeWorkOrderEntityInvolvement(
  item: WorkOrderEntityInvolvementInput,
): WorkOrderEntityInvolvementRow {
  return {
    id: item.id,
    entityId: item.entityId ?? null,
    // Flatten the nested entity join into the flat read-only display fields
    // (mirrors the planned-payment entity flatten).
    entityName: item.entity?.entity ?? null,
    entityType: item.entity?.entityType ?? null,
    involvementType: item.involvementType ?? "",
    createdAt: toIsoTimestamp(item.createdAt),
    updatedAt: toIsoTimestamp(item.updatedAt),
    createdBy: item.createdBy ?? null,
    updatedBy: item.updatedBy ?? null,
  }
}
