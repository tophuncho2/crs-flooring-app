"use client"

import { Banknote } from "lucide-react"
import { TextCell } from "@/engines/record-view"
import { DataTable, type DataTableColumn } from "@/engines/list-view"
import { CellChip, RecordDeleteButton, RecordOptionsMenu } from "@/engines/common"
import { WORK_ORDER_ENTITY_INVOLVEMENT_TYPE_MAX, type EntityOption } from "@builders/domain"
import { EntityTypePicker } from "@/modules/entities/components/picker/entity-type-picker"
import type { WorkOrderEntityInvolvementLocal } from "@/modules/work-orders/controllers/record/entity-involvement/use-work-order-entity-involvement-section"

const WORK_ORDER_ENTITY_INVOLVEMENT_COLUMNS: DataTableColumn<WorkOrderEntityInvolvementLocal>[] = [
  // Free-text involvement type leads (why they're involved); Entity is the link;
  // Type is a read-only lookup off the picked entity.
  { key: "involvementType", label: "Involvement Type", width: 320 },
  { key: "entity", label: "Entity", width: 220 },
  { key: "types", label: "Type", width: 200 },
]

// Pure editable-table body for the Entity Involvement section. The
// RecordItemSection chrome lives in the section host. No money/direction — a plain
// entity link + a read-only type chip + a free-text reason.
export function WorkOrderEntityInvolvementGrid({
  items,
  editable,
  onChangeField,
  onSelectEntity,
  onRemoveItem,
  onCreatePayment,
}: {
  items: WorkOrderEntityInvolvementLocal[]
  editable: boolean
  onChangeField: (
    itemId: string,
    field: keyof WorkOrderEntityInvolvementLocal,
    value: string,
  ) => void
  onSelectEntity: (itemId: string, option: EntityOption | null) => void
  onRemoveItem: (itemId: string) => void
  // Row ⋮ "Create payment" — opens a payment-create modal seeded from this row's entity.
  onCreatePayment: (item: WorkOrderEntityInvolvementLocal) => void
}) {
  return (
    <DataTable<WorkOrderEntityInvolvementLocal>
      variant="editable"
      rows={items}
      columns={WORK_ORDER_ENTITY_INVOLVEMENT_COLUMNS}
      empty="No entity involvement yet."
      // Two gutter controls (delete + ⋮ options) → widen past the 44px default.
      rowActionsWidth={72}
      rowActions={(item) => (
        <>
          <RecordDeleteButton
            ariaLabel="Remove entity involvement"
            title={editable ? "Remove this entity involvement" : "Saving..."}
            disabled={!editable}
            onClick={() => onRemoveItem(item.id)}
          />
          <RecordOptionsMenu
            ariaLabel="Entity involvement options"
            items={[
              {
                key: "create-payment",
                label: "Create payment",
                icon: <Banknote size={14} aria-hidden="true" />,
                onClick: () => onCreatePayment(item),
              },
            ]}
          />
        </>
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
                maxLength={WORK_ORDER_ENTITY_INVOLVEMENT_TYPE_MAX}
              />
            )
          default:
            return null
        }
      }}
    />
  )
}
