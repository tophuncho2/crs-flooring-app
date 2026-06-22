// @vitest-environment jsdom

/**
 * Pins the shared adjustment row ⋮ menu (`renderAdjustmentRowActions`): items are
 * propped in per host, and an omitted handler drops its item. The contract this
 * change adds — a "Delete adjustment" item that appears ONLY when `onDelete` is
 * wired (the record-view tables), never on the standalone ledger (`{ onSplitOff }`
 * only) — is the security-relevant invariant, so it's asserted directly here.
 */

import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { EnrichedInventoryAdjustmentRow } from "@builders/domain"
import { renderAdjustmentRowActions } from "@/modules/adjustments"

function row(overrides: Partial<EnrichedInventoryAdjustmentRow> = {}): EnrichedInventoryAdjustmentRow {
  return {
    id: "adj-1",
    adjustmentNumber: "ADJ-1",
    productId: "prod-1",
    productName: "Berber Carpet",
    status: "PENDING",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  } as EnrichedInventoryAdjustmentRow
}

/** Render the menu node and open it (items live behind the kebab trigger). */
async function openMenu(node: ReturnType<typeof renderAdjustmentRowActions>) {
  const user = userEvent.setup()
  render(<>{node}</>)
  await user.click(screen.getByRole("button", { name: /options for adjustment/i }))
  return user
}

describe("renderAdjustmentRowActions — delete item visibility", () => {
  afterEach(cleanup)

  it("ledger host ({ onSplitOff } only): shows split-off, NO delete", async () => {
    await openMenu(renderAdjustmentRowActions(row(), { onSplitOff: vi.fn() }))

    expect(screen.getByText("Add inventory from adjustment")).toBeTruthy()
    expect(screen.queryByText("Delete adjustment")).toBeNull()
  })

  it("record-view host (onDelete wired): shows an enabled delete that fires with the row", async () => {
    const onDelete = vi.fn()
    const target = row()
    const user = await openMenu(
      renderAdjustmentRowActions(target, { onSplitOff: vi.fn(), onDuplicate: vi.fn(), onDelete }),
    )

    const item = screen.getByRole("menuitem", { name: "Delete adjustment" })
    expect((item as HTMLButtonElement).disabled).toBe(false)

    await user.click(item)
    expect(onDelete).toHaveBeenCalledTimes(1)
    expect(onDelete).toHaveBeenCalledWith(target)
  })

  it("delete is disabled while the host is busy", async () => {
    await openMenu(renderAdjustmentRowActions(row(), { onDelete: vi.fn() }, true))

    const item = screen.getByRole("menuitem", { name: "Delete adjustment" })
    expect((item as HTMLButtonElement).disabled).toBe(true)
  })
})
