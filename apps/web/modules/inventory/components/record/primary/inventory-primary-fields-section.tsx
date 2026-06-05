"use client"

import type { InventoryForm, InventoryRow } from "@builders/domain"
import { InventoryDetailsGroup } from "./groups/inventory-details-group"

/**
 * The inventory "cells" grid for the record view's primary section. A thin
 * wrapper over the shared {@link InventoryDetailsGroup} (the same component the
 * dormant hub used), driven by the primary controller's draft. Only Location,
 * Internal Notes, and the archive chip are editable; everything else renders
 * static. Analog of `ManagementCompanyCellsSection`.
 */
export function InventoryPrimaryFieldsSection({
  inventory,
  draft,
  warehouseName,
  editable,
  onFieldChange,
}: {
  inventory: InventoryRow
  draft: InventoryForm
  warehouseName: string | null
  editable: boolean
  onFieldChange: (field: keyof InventoryForm, value: string | boolean) => void
}) {
  return (
    <InventoryDetailsGroup
      editable={editable}
      inventory={inventory}
      draft={draft}
      warehouseName={warehouseName}
      onFieldChange={onFieldChange}
    />
  )
}
