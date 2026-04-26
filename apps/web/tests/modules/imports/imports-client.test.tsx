// @vitest-environment jsdom
//
// Phase 2 of the imports migration covers the list view only. Detail and create
// flows (ImportDetailClient / ImportCreateClient) get test coverage in Phase 3
// and Phase 5 respectively.

import { beforeEach, describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { navigationMocks } from "../../helpers/next-navigation-mock"
import { resetSimpleTableClientMocks } from "../../helpers/simple-table-client-mocks"
import ImportsClient from "@/modules/imports/components/list/imports-client"
import type { ImportRow } from "@builders/domain"

function importRow(overrides: Partial<ImportRow> = {}): ImportRow {
  return {
    id: "imp-1",
    importNumber: 1,
    orderNumber: "PO-1",
    tag: "Spring Load",
    percent: "100",
    notes: "",
    warehouseId: "wh-1",
    warehouseName: "Main Warehouse",
    manufacturerId: "mfr-1",
    manufacturerName: "Acme Flooring",
    stagedInventoryRowsCount: 4,
    liveInventoryRowsCount: 4,
    createdAt: "2026-03-19T00:00:00.000Z",
    updatedAt: "2026-03-19T00:00:00.000Z",
    ...overrides,
  }
}

const EMPTY_TABLE_STATE = {
  searchQuery: "",
  isAscendingSort: true,
  isGroupingEnabled: false,
  groupByKeys: [],
}

describe("ImportsClient", () => {
  beforeEach(() => {
    resetSimpleTableClientMocks()
  })

  it("renders the column headers, the +Import action, and the row data", () => {
    render(
      <ImportsClient
        initialImports={[
          importRow(),
          importRow({
            id: "imp-2",
            importNumber: 2,
            tag: "Replenishment",
            percent: "37",
            warehouseName: "Warehouse 2",
            manufacturerName: "Mohawk",
            stagedInventoryRowsCount: 8,
            liveInventoryRowsCount: 3,
          }),
        ]}
        tableState={EMPTY_TABLE_STATE}
      />,
    )

    expect(screen.getByText("Imports")).toBeTruthy()
    expect(screen.getByRole("button", { name: /\+ Import/ })).toBeTruthy()

    for (const label of ["Import #", "Tag", "Warehouse", "Manufacturer", "Percent", "Staged", "Live", "Created"]) {
      expect(screen.getByText(label)).toBeTruthy()
    }

    expect(screen.getByText("IMP-0001")).toBeTruthy()
    expect(screen.getByText("IMP-0002")).toBeTruthy()
    expect(screen.getByText("Spring Load")).toBeTruthy()
    expect(screen.getByText("Replenishment")).toBeTruthy()
    expect(screen.getByText("Main Warehouse")).toBeTruthy()
    expect(screen.getByText("Warehouse 2")).toBeTruthy()
    expect(screen.getByText("Acme Flooring")).toBeTruthy()
    expect(screen.getByText("Mohawk")).toBeTruthy()
    expect(screen.getByText("100%")).toBeTruthy()
    expect(screen.getByText("37%")).toBeTruthy()
  })

  it("routes to the canonical create form when +Import is clicked", async () => {
    const user = userEvent.setup()

    render(<ImportsClient initialImports={[]} tableState={EMPTY_TABLE_STATE} />)

    await user.click(screen.getByRole("button", { name: /\+ Import/ }))

    expect(navigationMocks.push).toHaveBeenCalledWith(
      "/dashboard/imports/new?returnTo=%2Fdashboard%2Ftest",
      { scroll: false },
    )
  })

  it("opens an import record when its row is clicked", async () => {
    const user = userEvent.setup()

    render(
      <ImportsClient
        initialImports={[importRow({ id: "imp-7", importNumber: 7 })]}
        tableState={EMPTY_TABLE_STATE}
      />,
    )

    await user.click(screen.getByRole("button", { name: "Open import IMP-0007" }))

    expect(navigationMocks.push).toHaveBeenCalledWith(
      "/dashboard/imports/imp-7?returnTo=%2Fdashboard%2Ftest",
      { scroll: false },
    )
  })
})
