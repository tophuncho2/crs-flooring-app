"use client"

import { TextCell } from "@/components/cells"
import { StaticFieldValue } from "@/components/fields"
import {
  formatInventoryQuantity,
  INVENTORY_LOCATION_MAX,
  type InventoryForm,
  type InventoryRow,
} from "@builders/domain"
import { InventoryArchiveChip } from "../controls/inventory-archive-chip"
import { InventoryField } from "./inventory-field"
import { InventoryGroup } from "./inventory-group"

/**
 * Group 1: Stock. Left column stacks Warehouse → Location → Starting
 * Stock. Right column stacks Stock Balance → Coverage Balance → Total
 * Cut. The archive-status chip sits in the group header next to the
 * "Stock" tab, mirroring the WO complete chip's placement.
 */
export function InventoryStockGroup({
  editable,
  inventory,
  draft,
  warehouseName,
  onFieldChange,
}: {
  editable: boolean
  inventory: InventoryRow
  draft: InventoryForm
  warehouseName: string | null
  onFieldChange: (field: keyof InventoryForm, value: string | boolean) => void
}) {
  return (
    <InventoryGroup
      title="Stock"
      headerRight={
        <InventoryArchiveChip
          value={draft.isArchived}
          onChange={(next) => onFieldChange("isArchived", next)}
          disabled={!editable}
        />
      }
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-3">
          <InventoryField label="Warehouse">
            <StaticFieldValue>{warehouseName || "—"}</StaticFieldValue>
          </InventoryField>
          <InventoryField label="Location">
            <TextCell
              editable={editable}
              value={draft.location}
              onChange={(value) => onFieldChange("location", value)}
              maxLength={INVENTORY_LOCATION_MAX}
            />
          </InventoryField>
          <InventoryField label="Starting Stock">
            <StaticFieldValue>
              {formatInventoryQuantity(inventory.startingStock, inventory.stockUnitAbbrev)}
            </StaticFieldValue>
          </InventoryField>
        </div>
        <div className="flex flex-col gap-3">
          <InventoryField label="Stock Balance">
            <StaticFieldValue>
              {formatInventoryQuantity(inventory.stockBalance, inventory.stockUnitAbbrev)}
            </StaticFieldValue>
          </InventoryField>
          <InventoryField label="Coverage Balance">
            <StaticFieldValue>
              {inventory.coverageBalance
                ? formatInventoryQuantity(inventory.coverageBalance, inventory.itemCoverageUnitAbbrev)
                : "—"}
            </StaticFieldValue>
          </InventoryField>
          <InventoryField label="Coverage Per Unit">
            <StaticFieldValue>
              {inventory.coveragePerUnit
                ? formatInventoryQuantity(inventory.coveragePerUnit, inventory.itemCoverageUnitAbbrev)
                : "—"}
            </StaticFieldValue>
          </InventoryField>
          <InventoryField label="Total Cut">
            <StaticFieldValue>
              {formatInventoryQuantity(inventory.totalCutSum, inventory.stockUnitAbbrev)}
            </StaticFieldValue>
          </InventoryField>
        </div>
      </div>
    </InventoryGroup>
  )
}
