"use client"

import { TextCell } from "@/engines/record-view"
import { DataTable, type DataTableColumn } from "@/engines/list-view"
import { CellChip, RecordDeleteButton } from "@/engines/common"
import { TEMPLATE_ENTITY_INVOLVEMENT_TYPE_MAX, type EntityOption } from "@builders/domain"
import { EntityTypePicker } from "@/modules/entities/components/picker/entity-type-picker"
import type { TemplateEntityInvolvementLocal } from "@/modules/templates/controllers/record/entity-involvement/use-template-entity-involvement-section"

const TEMPLATE_ENTITY_INVOLVEMENT_COLUMNS: DataTableColumn<TemplateEntityInvolvementLocal>[] = [
  // Free-text involvement type leads (why they're involved); Entity is the link;
  // Type is a read-only lookup off the picked entity.
  { key: "involvementType", label: "Involvement Type", width: 320 },
  { key: "entity", label: "Entity", width: 220 },
  { key: "types", label: "Type", width: 200 },
]

// Pure editable-table body for the Entity Involvement section. The
// RecordItemSection chrome lives in the section host. No money/direction — a plain
// entity link + a read-only type chip + a free-text reason.
export function TemplateEntityInvolvementGrid({
  items,
  editable,
  onChangeField,
  onSelectEntity,
  onRemoveItem,
}: {
  items: TemplateEntityInvolvementLocal[]
  editable: boolean
  onChangeField: (
    itemId: string,
    field: keyof TemplateEntityInvolvementLocal,
    value: string,
  ) => void
  onSelectEntity: (itemId: string, option: EntityOption | null) => void
  onRemoveItem: (itemId: string) => void
}) {
  return (
    <DataTable<TemplateEntityInvolvementLocal>
      variant="editable"
      rows={items}
      columns={TEMPLATE_ENTITY_INVOLVEMENT_COLUMNS}
      empty="No entity involvement yet."
      rowActions={(item) => (
        <RecordDeleteButton
          ariaLabel="Remove entity involvement"
          title={editable ? "Remove this entity involvement" : "Saving..."}
          disabled={!editable}
          onClick={() => onRemoveItem(item.id)}
        />
      )}
      renderCell={(column, item) => {
        switch (column.key) {
          case "entity":
            return (
              <EntityTypePicker
                value={item.entityId}
                selectedLabel={item.entityName}
                disabled={!editable}
                onChange={(id) => {
                  // Only the clear path needs handling here — a real pick fires
                  // onOptionSelected with the full option. Snapshotting id+name+
                  // types together keeps selectedLabel from ever desyncing.
                  if (id === null) onSelectEntity(item.id, null)
                }}
                onOptionSelected={(option) => onSelectEntity(item.id, option)}
                placeholder="Select entity"
                ariaLabel="Involvement entity"
                align="left"
              />
            )
          case "types":
            return item.entityType ? (
              <CellChip paletteColor={item.entityType.color}>{item.entityType.type}</CellChip>
            ) : (
              "—"
            )
          case "involvementType":
            return (
              <TextCell
                editable={editable}
                value={item.involvementType}
                onChange={(next) => onChangeField(item.id, "involvementType", next)}
                placeholder="Involvement type"
                ariaLabel="Involvement type"
                maxLength={TEMPLATE_ENTITY_INVOLVEMENT_TYPE_MAX}
              />
            )
          default:
            return null
        }
      }}
    />
  )
}
