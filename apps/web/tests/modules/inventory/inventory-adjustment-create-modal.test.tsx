// @vitest-environment jsdom

/**
 * Guards the inventory record view's adjustment **create modal**. The inventory
 * is always locked to the record you're on, so the modal renders a *read-only*
 * identity row (no "Change" affordance) above the shared form cells and posts to
 * the inventory create route. Two entry points share one shell, varying by the
 * injected `source` only:
 *   - blank create ("+ Adjustment" / the list deep-link) — no work-order seed;
 *   - duplicate (row ⋮) — seeds the source row's work-order link + adjustment
 *     values (quantity / type / notes / waste).
 *
 * Only the network boundary (`createAdjustmentRequest`) is mocked; the real
 * controller (`useAdjustmentCreateForm`) + form cells run.
 */

import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { EnrichedInventoryAdjustmentRow, InventoryDetail } from "@builders/domain"

const { createAdjustmentRequestMock } = vi.hoisted(() => ({
  createAdjustmentRequestMock: vi.fn(),
}))

vi.mock("@/modules/adjustments/data/mutations", async () => {
  const actual = await vi.importActual<typeof import("@/modules/adjustments/data/mutations")>(
    "@/modules/adjustments/data/mutations",
  )
  return { ...actual, createAdjustmentRequest: createAdjustmentRequestMock }
})

import { InventoryAdjustmentCreateModal } from "@/modules/inventory/components/record/adjustments/inventory-adjustment-create-modal"

function inventory(): InventoryDetail {
  return {
    id: "inv-1",
    inventoryNumber: "INV-1",
    importEntryId: "",
    importNumber: null,
    purchaseOrderNumber: "",
    productId: "prod-1",
    productName: "Berber Carpet",
    categoryId: "",
    categoryName: "",
    categorySlug: "carpet",
    stockUnitName: "square foot",
    stockUnitAbbrev: "sqft",
    sendUnitName: "",
    sendUnitAbbrev: "",
    rollPrefix: "R",
    rollNumber: "12",
    dyeLot: "DL-3",
    warehouseId: "wh-1",
    warehouseName: "Main Warehouse",
    location: "A1",
    startingStock: "100",
    netDeducted: "0",
    stockBalance: "100",
    isArchived: false,
    wasMerged: false,
    note: "",
    internalNotes: "",
    createdAt: "",
    updatedAt: "",
    inventoryAdjustments: [],
    previousInventory: null,
    nextInventory: null,
  }
}

function renderModal(source?: EnrichedInventoryAdjustmentRow) {
  const onCreated = vi.fn()
  const onClose = vi.fn()
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <InventoryAdjustmentCreateModal
        inventory={inventory()}
        source={source}
        onClose={onClose}
        onCreated={onCreated}
      />
    </QueryClientProvider>,
  )
  return { onCreated, onClose, ...utils }
}

describe("InventoryAdjustmentCreateModal", () => {
  afterEach(() => {
    cleanup()
    createAdjustmentRequestMock.mockReset()
  })

  it("blank create: inventory locked (no Change), a valid quantity fires create + onCreated", async () => {
    createAdjustmentRequestMock.mockResolvedValue({
      adjustment: {},
      inventoryId: "inv-1",
      netDeducted: "5",
    })
    const user = userEvent.setup()
    const { onCreated } = renderModal()

    expect(screen.getByText("Add adjustment")).toBeTruthy()
    // Locked identity row → read-only confirmation, no "Change" button.
    expect(screen.queryByRole("button", { name: /change/i })).toBeNull()

    await user.type(screen.getByLabelText("Adjustment quantity"), "5")
    await user.click(screen.getByRole("button", { name: "Create" }))

    await waitFor(() => expect(createAdjustmentRequestMock).toHaveBeenCalledTimes(1))
    expect(createAdjustmentRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({ inventoryId: "inv-1", quantity: "5", workOrderId: null }),
    )
    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1))
  })

  it("duplicate: seeds the source work-order link + adjustment values (qty / type / notes / waste)", async () => {
    createAdjustmentRequestMock.mockResolvedValue({
      adjustment: {},
      inventoryId: "inv-1",
      netDeducted: "7",
    })
    const user = userEvent.setup()
    const source = {
      workOrderId: "wo-9",
      workOrderNumber: "1234",
      quantity: "7",
      adjustmentType: "INCREASE",
      isWaste: true,
      notes: "scrap from cut",
    } as EnrichedInventoryAdjustmentRow
    const { onCreated } = renderModal(source)

    expect(screen.getByText("Duplicate adjustment")).toBeTruthy()
    // Quantity + notes are pre-seeded from the source (not blank).
    expect((screen.getByLabelText("Adjustment quantity") as HTMLInputElement).value).toBe("7")
    expect((screen.getByLabelText("Adjustment notes") as HTMLInputElement).value).toBe(
      "scrap from cut",
    )

    // Create straight away — the seeded quantity already makes the form valid.
    await user.click(screen.getByRole("button", { name: "Create" }))

    await waitFor(() => expect(createAdjustmentRequestMock).toHaveBeenCalledTimes(1))
    expect(createAdjustmentRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        inventoryId: "inv-1",
        quantity: "7",
        workOrderId: "wo-9",
        adjustmentType: "INCREASE",
        isWaste: true,
        notes: "scrap from cut",
      }),
    )
    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1))
  })
})
