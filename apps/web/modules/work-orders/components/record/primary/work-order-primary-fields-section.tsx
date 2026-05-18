"use client"

import { FieldSection } from "@/components/fields"
import { PropertyJoinedReadOnlyCells } from "@/modules/shared/property-fields"
import type { WorkOrderForm } from "@builders/domain"
import type { WorkOrderPrimaryDetail } from "./types"
import { usePropertyJoinedOverride } from "./use-property-joined-override"
import { WorkOrderMetaFieldsBand } from "./fields/work-order-meta-fields-band"
import { WorkOrderPropertyFieldsBand } from "./fields/work-order-property-fields-band"
import { WorkOrderUnitFieldsBand } from "./fields/work-order-unit-fields-band"
import { WorkOrderNotesFieldsBand } from "./fields/work-order-notes-fields-band"

export type { WorkOrderPrimaryDetail } from "./types"

/**
 * Composer for the WO primary section. Pure orchestration:
 *  - row 1     → meta band (warehouse / job type / scheduled / complete)
 *  - rows 2–4  → property band (left col) + unit band (right col)
 *  - rows 5–6  → notes band (description + custom address)
 *  - rows 7–8  → joined readonly cells (live-previewed via the override hook)
 *  - rows 9–10 → notes band (installer instructions + internal notes)
 *
 * The notes band declares all four textareas with explicit row numbers,
 * so it renders once and `FieldSection`'s positional grid places each
 * cell where it belongs.
 */
export function WorkOrderPrimaryFieldsSection({
  draft,
  detail,
  disabled,
  onFieldChange,
  onFieldsChange,
}: {
  draft: WorkOrderForm
  detail: WorkOrderPrimaryDetail | null
  disabled: boolean
  onFieldChange: <K extends keyof WorkOrderForm>(field: K, value: WorkOrderForm[K]) => void
  /** Multi-field setter — used by the property-fields band for the MC→Property→Template cascade. */
  onFieldsChange: (patch: Partial<WorkOrderForm>) => void
}) {
  const editable = !disabled
  const { propertyJoined, handlePropertyOption } = usePropertyJoinedOverride(detail)

  return (
    <FieldSection>
      <WorkOrderMetaFieldsBand
        editable={editable}
        draft={draft}
        detail={detail}
        onFieldChange={onFieldChange}
      />
      <WorkOrderPropertyFieldsBand
        editable={editable}
        draft={draft}
        detail={detail}
        onFieldChange={onFieldChange}
        onFieldsChange={onFieldsChange}
        onPropertyOption={handlePropertyOption}
      />
      <WorkOrderUnitFieldsBand
        editable={editable}
        draft={draft}
        onFieldChange={onFieldChange}
      />
      <WorkOrderNotesFieldsBand
        editable={editable}
        draft={draft}
        onFieldChange={onFieldChange}
      />
      <PropertyJoinedReadOnlyCells property={propertyJoined} startRow={7} />
    </FieldSection>
  )
}
