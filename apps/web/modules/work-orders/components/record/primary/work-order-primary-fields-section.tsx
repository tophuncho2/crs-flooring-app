"use client"

import type { WorkOrderForm } from "@builders/domain"
import type { PropertyHubSaveResult } from "@/modules/properties/controllers/property-hub-side-panel"
import { WorkOrderNotesGroup } from "./groups/work-order-notes-group"
import { WorkOrderPropertyUnitGroup } from "./groups/work-order-property-unit-group"
import { WorkOrderScheduleGroup } from "./groups/work-order-schedule-group"
import type { WorkOrderPrimaryDetail } from "./types"
import { usePropertyJoinedOverride } from "./use-property-joined-override"

export type { WorkOrderPrimaryDetail } from "./types"

/**
 * Composer for the WO primary section. Renders three visual groups in
 * order — Schedule, Property & Unit, Notes — each with a tab-style
 * header matching the list-view toolbar. Pure UI orchestration; the
 * `draft` / `onFieldChange` / `onFieldsChange` interface is unchanged
 * from the prior band-based composition.
 */
export function WorkOrderPrimaryFieldsSection({
  draft,
  detail,
  disabled,
  onFieldChange,
  onFieldsChange,
  onHubEntitySaved,
}: {
  draft: WorkOrderForm
  detail: WorkOrderPrimaryDetail | null
  disabled: boolean
  onFieldChange: <K extends keyof WorkOrderForm>(field: K, value: WorkOrderForm[K]) => void
  /** Multi-field setter — used by the property-unit group for the MC→Property→Template cascade. */
  onFieldsChange: (patch: Partial<WorkOrderForm>) => void
  /** Forwarded to the embedded property-hub side panel — host patches its detail on save. */
  onHubEntitySaved?: (result: PropertyHubSaveResult) => void
}) {
  const editable = !disabled
  const { propertyJoined, handlePropertyOption } = usePropertyJoinedOverride(detail)

  return (
    <div className="flex flex-col gap-4">
      <WorkOrderScheduleGroup
        editable={editable}
        draft={draft}
        detail={detail}
        onFieldChange={onFieldChange}
      />
      <WorkOrderPropertyUnitGroup
        editable={editable}
        draft={draft}
        detail={detail}
        propertyJoined={draft.propertyId ? propertyJoined : null}
        onFieldChange={onFieldChange}
        onFieldsChange={onFieldsChange}
        onPropertyOption={handlePropertyOption}
        onHubEntitySaved={onHubEntitySaved}
      />
      <WorkOrderNotesGroup
        editable={editable}
        draft={draft}
        onFieldChange={onFieldChange}
      />
    </div>
  )
}
