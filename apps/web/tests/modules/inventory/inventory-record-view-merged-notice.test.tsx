// @vitest-environment jsdom

/**
 * Guards the "this inventory was merged — edit at your own risk" notice in the
 * inventory record view. The notice is gated purely on `entry.wasMerged`
 * (inventory-record-view.tsx), so this test renders the real component with its
 * heavy collaborators (the primary + adjustments section controllers and the
 * record-view layout panels) stubbed to no-ops — leaving the `wasMerged` gate as
 * the only live logic. It fails if that conditional is removed or inverted.
 */

import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { InventoryDetail } from "@builders/domain"
import type { RecordDetailClientScaffoldContext } from "@/engines/record-view"

// The two section controllers pull in react-query + complex state machines; stub
// them to the minimal shape the record view reads at construction time (the
// primary `record`, and the adjustments `panel.close()` the mount effect calls).
vi.mock(
  "@/modules/inventory/controllers/record/primary/use-inventory-primary-section",
  () => ({
    useInventoryPrimarySection: () => ({
      primarySection: {},
      record: { warehouseName: "WH-1" },
      refreshRecord: vi.fn(),
      deleteRecord: vi.fn(),
    }),
  }),
)

vi.mock(
  "@/modules/inventory/controllers/record/adjustments/use-inventory-adjustments-section",
  () => ({
    useInventoryAdjustmentsSection: () => ({
      panel: { close: vi.fn() },
      openEdit: vi.fn(),
    }),
  }),
)

// Stub the layout panels so the section render callbacks never fire — we only
// care about the notice rendered alongside them. `WarningNotice` comes from
// `@/engines/common`, so it stays real and the assertion sees its text.
vi.mock("@/engines/record-view", async () => {
  const actual =
    await vi.importActual<typeof import("@/engines/record-view")>("@/engines/record-view")
  return {
    ...actual,
    RecordMultiSectionPanel: () => null,
    RecordEntityFooter: () => null,
  }
})

import { InventoryRecordView } from "@/modules/inventory/components/record/inventory-record-view"

const NOTICE = /edit at your own risk/i

function renderRecordView(wasMerged: boolean) {
  const entry = { id: "inv-1", wasMerged } as unknown as InventoryDetail
  const page = {
    closePage: vi.fn(),
    confirmNavigation: vi.fn(),
  } as unknown as RecordDetailClientScaffoldContext
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <InventoryRecordView
        page={page}
        entry={entry}
        selectedAdjustmentId={null}
        onSelectAdjustment={vi.fn()}
      />
    </QueryClientProvider>,
  )
}

describe("InventoryRecordView — merged notice", () => {
  afterEach(() => cleanup())

  it("shows the merged warning when entry.wasMerged is true", () => {
    renderRecordView(true)
    expect(screen.getByText(NOTICE)).toBeTruthy()
  })

  it("hides the merged warning when entry.wasMerged is false", () => {
    renderRecordView(false)
    expect(screen.queryByText(NOTICE)).toBeNull()
  })
})
