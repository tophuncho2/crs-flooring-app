"use client"

import { RecordItemSection } from "@/engines/record-view"
import type { useWorkOrderEntityInvolvementSection } from "@/modules/work-orders/controllers/record/entity-involvement/use-work-order-entity-involvement-section"
import { WorkOrderEntityInvolvementGrid } from "./work-order-entity-involvement-grid"

type EntityInvolvementController = ReturnType<typeof useWorkOrderEntityInvolvementSection>

/**
 * The work order's Entity Involvement section — a standalone editable grid (entity ·
 * type · involvement type) capturing why an entity is involved in the job (separate
 * from the entity's own type). A future second surface to create payments. Managed
 * save/discard + add-row chrome lives in the shared RecordItemSection subHeader.
 */
export function WorkOrderEntityInvolvementSection({
  section,
}: {
  section: EntityInvolvementController
}) {
  const editable = !section.isSaving
  const count = section.items.length

  return (
    <RecordItemSection
      title="Entity Involvement"
      capabilities={{ editable: true, supportsSaveDiscard: true, supportsAddRow: true }}
      noticeMessage={section.noticeMessage}
      noticeError={section.noticeError}
      subHeader={{
        statusLeading: (
          <span className="inline-flex items-center rounded-xl border border-[rgba(58,58,58,0.72)] bg-[var(--panel-hover)] px-3 py-2 text-sm text-[var(--foreground)]/75">
            {count} entit{count === 1 ? "y" : "ies"}
          </span>
        ),
        isDirty: section.isDirty,
        isSaving: section.isSaving,
        hasConflict: section.hasConflict,
        onSave: () => void section.save(),
        onDiscard: () => section.discard(),
        saveLabel: "Save",
        savingLabel: "Saving...",
        discardLabel: "Discard",
        error: section.error ? section.error.message : null,
        actions: [
          {
            key: "add-entity-involvement",
            label: "+ Add Entity",
            kind: "add-row",
            onClick: section.addItem,
            disabled: section.isSaving,
          },
        ],
      }}
    >
      <WorkOrderEntityInvolvementGrid
        items={section.items}
        editable={editable}
        onChangeField={section.changeField}
        onSelectEntity={section.selectEntity}
        onRemoveItem={section.removeItem}
      />
    </RecordItemSection>
  )
}
