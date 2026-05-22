"use client"

import { useMemo, type KeyboardEvent } from "react"
import { toInventoryForm } from "@builders/domain"
import type { InventoryHubSidePanelController } from "@/modules/inventory/controllers/inventory-hub-side-panel"
import { InventoryInternalGroup } from "../../record/primary/groups/inventory-internal-group"
import { InventoryProductGroup } from "../../record/primary/groups/inventory-product-group"
import { InventoryStockGroup } from "../../record/primary/groups/inventory-stock-group"

const NOOP = () => {}

/**
 * Read-only inventory cells card. Renders the same three groups the
 * record-view primary section uses, with `editable=false` so every cell
 * (and the archive chip) renders as static. Clicking anywhere in the
 * card transitions the hub into `section-edit-inventory` mode.
 *
 * The wrapper is a `div[role="button"]` rather than a `<button>` so the
 * group internals (which may render their own buttons or interactive
 * cells in other contexts) don't produce nested-button HTML.
 */
export function InventoryHubViewSection({
  controller,
}: {
  controller: InventoryHubSidePanelController
}) {
  const { inventory, warehouseName, enterInventoryEditFromContext } = controller

  // Snapshot draft for the read-only render — when the user enters edit
  // mode the slice hydrates its own form from the same source.
  const draft = useMemo(
    () => (inventory ? toInventoryForm(inventory) : null),
    [inventory],
  )
  if (!inventory || !draft) return null

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      enterInventoryEditFromContext()
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={enterInventoryEditFromContext}
      onKeyDown={handleKeyDown}
      aria-label="Edit inventory"
      className="cursor-pointer rounded-md border border-transparent p-2 transition hover:border-blue-500/40 hover:bg-blue-500/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
    >
      <div className="flex flex-col gap-4">
        <InventoryStockGroup
          editable={false}
          inventory={inventory}
          draft={draft}
          warehouseName={warehouseName}
          onFieldChange={NOOP}
        />
        <InventoryProductGroup inventory={inventory} />
        <InventoryInternalGroup
          editable={false}
          inventory={inventory}
          draft={draft}
          onFieldChange={NOOP}
        />
      </div>
    </div>
  )
}
