import { toIsoTimestamp } from "../../shared/date-format.js"
import { normalizePercent } from "../../shared/percent.js"
import type { PaletteColor } from "../../shared/palette.js"
import type { TemplateCommissionRow } from "./types.js"

type TemplateCommissionInput = {
  id: string
  entityId: string | null
  // Nested entity relation (from `entityTypeSelect` in the data layer); flattened
  // here to entityName + entityType. Absent/null on unlinked rows. Mirrors the
  // planned-payment entity flatten.
  entity?: {
    entity: string
    entityType: { id: string; type: string; color: PaletteColor } | null
  } | null
  // Persisted scale-3 percent column (nullable). Normalized on read to a canonical
  // "X.XXX" ("" when NULL) so dirty-checks compare stable strings.
  percent: { toString(): string } | null
  notes: string | null
  createdAt: Date | string
  updatedAt: Date | string
  createdBy: string | null
  updatedBy: string | null
}

export function normalizeTemplateCommission(item: TemplateCommissionInput): TemplateCommissionRow {
  return {
    id: item.id,
    entityId: item.entityId ?? null,
    entityName: item.entity?.entity ?? null,
    entityType: item.entity?.entityType ?? null,
    // Rate-on-read: canonical scale-3 "X.XXX" / "" so dirty-checks compare stable
    // strings (mirrors the template taxRate-on-read step).
    percent: item.percent == null ? "" : normalizePercent(item.percent.toString()),
    notes: item.notes ?? "",
    createdAt: toIsoTimestamp(item.createdAt),
    updatedAt: toIsoTimestamp(item.updatedAt),
    createdBy: item.createdBy ?? null,
    updatedBy: item.updatedBy ?? null,
  }
}
