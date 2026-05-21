"use client"

import { StaticFieldValue } from "@/components/fields"
import type { InventoryRow } from "@builders/domain"
import { InventoryField } from "./inventory-field"
import { InventoryGroup } from "./inventory-group"

/**
 * Group 2: Product. Left column stacks Category → Inv # → Dye Lot.
 * Right column stacks Product → Roll # → Note. All read-only — these
 * identify the inventory row and are seeded at create time.
 */
export function InventoryProductGroup({
  inventory,
}: {
  inventory: InventoryRow
}) {
  return (
    <InventoryGroup title="Product">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-3">
          <InventoryField label="Category">
            <StaticFieldValue>{inventory.categoryName || "—"}</StaticFieldValue>
          </InventoryField>
          <InventoryField label="Inv #">
            <StaticFieldValue>{inventory.inventoryNumber}</StaticFieldValue>
          </InventoryField>
          <InventoryField label="Dye Lot">
            <StaticFieldValue>{inventory.dyeLot || "—"}</StaticFieldValue>
          </InventoryField>
        </div>
        <div className="flex flex-col gap-3">
          <InventoryField label="Product">
            <StaticFieldValue>{inventory.productName || "—"}</StaticFieldValue>
          </InventoryField>
          <InventoryField label="Roll #">
            <StaticFieldValue>{inventory.rollNumber || "—"}</StaticFieldValue>
          </InventoryField>
          <InventoryField label="Note">
            <StaticFieldValue>{inventory.note || "—"}</StaticFieldValue>
          </InventoryField>
        </div>
      </div>
    </InventoryGroup>
  )
}
