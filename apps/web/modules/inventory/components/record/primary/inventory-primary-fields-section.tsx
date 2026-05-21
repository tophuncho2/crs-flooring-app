"use client"

import type { InventoryForm, InventoryRow } from "@builders/domain"
import { InventoryInternalGroup } from "./groups/inventory-internal-group"
import { InventoryProductGroup } from "./groups/inventory-product-group"
import { InventoryStockGroup } from "./groups/inventory-stock-group"

/**
 * Composer for the inventory primary section. Renders three visual
 * groups in order — Stock, Product, Internal — each with a tab-style
 * header matching the WO/template record view. The archive toggle
 * lives in the Stock group header (top-right), not in the grid.
 */
export function InventoryPrimaryFieldsSection({
  inventory,
  draft,
  warehouseName,
  disabled,
  onFieldChange,
}: {
  inventory: InventoryRow
  draft: InventoryForm
  warehouseName: string | null
  disabled: boolean
  onFieldChange: (field: keyof InventoryForm, value: string | boolean) => void
}) {
  const editable = !disabled

  return (
    <div className="flex flex-col gap-4">
      <InventoryStockGroup
        editable={editable}
        inventory={inventory}
        draft={draft}
        warehouseName={warehouseName}
        onFieldChange={onFieldChange}
      />
      <InventoryProductGroup inventory={inventory} />
      <InventoryInternalGroup
        editable={editable}
        inventory={inventory}
        draft={draft}
        onFieldChange={onFieldChange}
      />
    </div>
  )
}
