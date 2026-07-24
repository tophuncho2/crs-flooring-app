"use client"

import { RecordItemSection } from "@/engines/record-view"
import type { useTemplateEntityInvolvementSection } from "@/modules/templates/controllers/record/entity-involvement/use-template-entity-involvement-section"
import { TemplateEntityInvolvementGrid } from "./entity-involvement/template-entity-involvement-grid"

type EntityInvolvementController = ReturnType<typeof useTemplateEntityInvolvementSection>

/**
 * The template's Entity Involvement section — a standalone editable grid (entity ·
 * type · involvement type) capturing why an entity is involved (separate from the
 * entity's own type). Mirrors the work-order surface and carries forward on sync.
 * Managed save/discard + add-row chrome lives in the shared RecordItemSection.
 */
export function TemplateEntityInvolvementSection({
  section,
}: {
  section: EntityInvolvementController
}) {
  const editable = !section.isSaving
  const count = section.items.length

  return (
    <RecordItemSection
      title="Entity Involvement"
      flush
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
      <TemplateEntityInvolvementGrid
        items={section.items}
        editable={editable}
        onChangeField={section.changeField}
        onSelectEntity={section.selectEntity}
        onRemoveItem={section.removeItem}
      />
    </RecordItemSection>
  )
}
