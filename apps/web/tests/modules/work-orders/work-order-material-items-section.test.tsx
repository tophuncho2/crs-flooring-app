// @vitest-environment jsdom

/**
 * Guards the work-order material-items section wiring this change adds:
 *   - Part 1: `?view=requested` lands on the Requested Material view (not the
 *     default Adjustments view).
 *   - Part 2: a requested row's "create adjustment" control opens the create
 *     modal pre-seeded with that row's product.
 *   - Part 3: a row ⋮ → "Delete adjustment" → confirm → fires the scope-aware
 *     delete request (work-order scope + the row's expectedUpdatedAt).
 *
 * The heavy collaborators (the create modal's inventory picker, the product
 * picker) are stubbed; only the network boundary (`deleteAdjustmentRequest`)
 * and navigation are mocked. The real section state machine + grids run.
 */

import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type {
  EnrichedInventoryAdjustmentRow,
  WorkOrderDetail,
  WorkOrderMaterialItemRow,
} from "@builders/domain"
import type { WorkOrderMaterialItemsSectionController } from "@/modules/work-orders/controllers/record/material-items/use-work-order-material-items-section"
import type { WorkOrderMaterialItemLocal } from "@/modules/work-orders/controllers/record/material-items/use-work-order-material-items-section"

// Controllable `?view=` for the mode-init assertions.
let searchParamsValue = ""
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
  usePathname: () => "/dashboard/work-orders/wo-1",
  useSearchParams: () => new URLSearchParams(searchParamsValue),
}))

// Stub the create modal — we only assert it mounts with the right product.
vi.mock(
  "@/modules/inventory/components/record/adjustments/work-order-adjustment-create-modal",
  () => ({
    WorkOrderAdjustmentCreateModal: ({
      product,
    }: {
      product: { id: string; name: string } | null
    }) => <div data-testid="create-modal">product:{product?.name ?? "none"}</div>,
  }),
)

// Stub the product picker — keeps the requested grid free of async dropdown wiring.
vi.mock("@/modules/products/components/picker/product-category-picker", () => ({
  ProductCategoryPicker: ({ productLabel }: { productLabel: string | null }) => (
    <div data-testid="product-cell">{productLabel ?? "—"}</div>
  ),
}))

const { deleteAdjustmentRequestMock } = vi.hoisted(() => ({
  deleteAdjustmentRequestMock: vi.fn(),
}))
vi.mock("@/modules/adjustments/data/mutations", async () => {
  const actual = await vi.importActual<typeof import("@/modules/adjustments/data/mutations")>(
    "@/modules/adjustments/data/mutations",
  )
  return { ...actual, deleteAdjustmentRequest: deleteAdjustmentRequestMock }
})

import { WorkOrderMaterialItemsSection } from "@/modules/work-orders/components/record/material-items/work-order-material-items-section"

function workOrder(): WorkOrderDetail {
  return {
    id: "wo-1",
    workOrderNumber: "1001",
    warehouseId: "wh-1",
    warehouseName: "Main Warehouse",
  } as WorkOrderDetail
}

function materialItem(overrides: Partial<WorkOrderMaterialItemLocal> = {}): WorkOrderMaterialItemLocal {
  return {
    id: "mi-1",
    productId: "prod-1",
    productName: "Berber Carpet",
    unitAbbrev: "sqft",
    quantity: "10",
    notes: "",
    categoryFilterId: null,
    ...overrides,
  }
}

function adjustment(overrides: Partial<EnrichedInventoryAdjustmentRow> = {}): EnrichedInventoryAdjustmentRow {
  return {
    id: "adj-1",
    adjustmentNumber: "ADJ-1",
    inventoryId: "inv-1",
    inventoryNumber: "INV-1",
    rollPrefix: "R",
    rollNumber: "12",
    dyeLot: "DL-3",
    inventoryNote: "",
    location: "A1",
    productId: "prod-1",
    productName: "Berber Carpet",
    warehouseId: "wh-1",
    workOrderId: "wo-1",
    before: "100",
    quantity: "5",
    after: "95",
    unitName: "square foot",
    unitAbbrev: "sqft",
    adjustmentType: "DEDUCTION",
    status: "PENDING",
    isWaste: false,
    notes: "",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    workOrderNumber: "1001",
    warehouseName: "Main Warehouse",
    ...overrides,
  } as EnrichedInventoryAdjustmentRow
}

function sectionController(
  overrides: Partial<WorkOrderMaterialItemsSectionController> = {},
): WorkOrderMaterialItemsSectionController {
  return {
    items: [],
    isSaving: false,
    isDirty: false,
    hasConflict: false,
    error: null,
    noticeMessage: null,
    noticeError: null,
    save: vi.fn(),
    discard: vi.fn(),
    addItem: vi.fn(),
    removeItem: vi.fn(),
    changeField: vi.fn(),
    setProductSnapshot: vi.fn(),
    changeCategoryFilter: vi.fn(),
    ...overrides,
  } as unknown as WorkOrderMaterialItemsSectionController
}

function materialItemRow(overrides: Partial<WorkOrderMaterialItemRow> = {}): WorkOrderMaterialItemRow {
  return {
    id: "mir-1",
    productId: "prod-1",
    productName: "Berber Carpet",
    quantity: "8",
    unitName: "square foot",
    unitAbbrev: "sqft",
    notes: "",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  }
}

function renderSection({
  view = "",
  section = sectionController(),
  adjustments = [] as EnrichedInventoryAdjustmentRow[],
  materialItems = [] as WorkOrderMaterialItemRow[],
}: {
  view?: string
  section?: WorkOrderMaterialItemsSectionController
  adjustments?: EnrichedInventoryAdjustmentRow[]
  materialItems?: WorkOrderMaterialItemRow[]
} = {}) {
  searchParamsValue = view
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <WorkOrderMaterialItemsSection
        workOrder={workOrder()}
        adjustmentsForWorkOrder={adjustments}
        materialItems={materialItems}
        section={section}
      />
    </QueryClientProvider>,
  )
}

describe("WorkOrderMaterialItemsSection", () => {
  afterEach(() => {
    cleanup()
    deleteAdjustmentRequestMock.mockReset()
    searchParamsValue = ""
  })

  it("Part 1: defaults to the Adjustments view", () => {
    renderSection()
    expect(screen.getByRole("button", { name: "+ Add Adjustment" })).toBeTruthy()
    expect(screen.queryByRole("button", { name: "+ Add Material Item" })).toBeNull()
  })

  it("Part 1: ?view=requested opens the Requested Material view", () => {
    renderSection({ view: "view=requested" })
    expect(screen.getByRole("button", { name: "+ Add Material Item" })).toBeTruthy()
    expect(screen.queryByRole("button", { name: "+ Add Adjustment" })).toBeNull()
  })

  it("surfaces the per-product Requested total in the Adjustments view", () => {
    renderSection({
      adjustments: [adjustment()],
      materialItems: [materialItemRow({ quantity: "8", unitAbbrev: "sqft" })],
    })
    expect(screen.getByText("Requested")).toBeTruthy()
    expect(screen.getByText("8 sqft")).toBeTruthy()
  })

  it("Part 2: a requested row's create-adjustment control opens the modal seeded with the product", async () => {
    const user = userEvent.setup()
    renderSection({
      view: "view=requested",
      section: sectionController({ items: [materialItem()] }),
    })

    expect(screen.queryByTestId("create-modal")).toBeNull()
    await user.click(screen.getByRole("button", { name: "Create adjustment for this product" }))

    const modal = await screen.findByTestId("create-modal")
    expect(modal.textContent).toContain("product:Berber Carpet")
  })

  it("Part 3: row ⋮ → Delete adjustment → confirm deletes via the row's inventory route", async () => {
    deleteAdjustmentRequestMock.mockResolvedValue({
      deletedId: "adj-1",
      inventoryId: "inv-1",
      netDeducted: "0",
    })
    const user = userEvent.setup()
    renderSection({ adjustments: [adjustment()] })

    await user.click(screen.getByRole("button", { name: "Options for adjustment ADJ-1" }))
    await user.click(screen.getByRole("menuitem", { name: "Delete adjustment" }))
    // Confirm dialog → commit.
    await user.click(screen.getByRole("button", { name: "Delete" }))

    await waitFor(() => expect(deleteAdjustmentRequestMock).toHaveBeenCalledTimes(1))
    // Deletes via the adjustment's own INVENTORY route — there is no
    // work-order-scoped adjustment route (regression guard: WO scope 404'd).
    expect(deleteAdjustmentRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: { kind: "inventory", inventoryId: "inv-1" },
        adjustmentId: "adj-1",
        expectedUpdatedAt: "2026-01-02T00:00:00.000Z",
      }),
    )
  })
})
