// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { NuqsTestingAdapter } from "nuqs/adapters/testing"
import { navigationMocks } from "../../helpers/next-navigation-mock"
import type { ImportRow } from "@builders/domain"
import type { ListInput, ListOutput } from "@builders/application"
import type { ImportsListFilters } from "@builders/application"

const { listImportsRequestMock } = vi.hoisted(() => ({
  listImportsRequestMock: vi.fn<
    (input: ListInput<ImportsListFilters>) => Promise<ListOutput<ImportRow>>
  >(),
}))

vi.mock("@/modules/imports/data/list-imports-request", async () => {
  const actual = await vi.importActual<typeof import("@/modules/imports/data/list-imports-request")>(
    "@/modules/imports/data/list-imports-request",
  )
  return {
    ...actual,
    listImportsRequest: listImportsRequestMock,
  }
})

import ImportsClient from "@/modules/imports/components/list/imports-client"

function importRow(overrides: Partial<ImportRow> = {}): ImportRow {
  return {
    id: "imp-1",
    importNumber: 1,
    purchaseOrderNumber: "PO-1",
    internalNotes: "",
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

function renderImportsClient({
  rows,
  total = rows.length,
  initialSearchQuery = "",
  initialIsAscendingSort = true,
  initialGroupField = null,
  initialPage = 1,
}: {
  rows: ImportRow[]
  total?: number
  initialSearchQuery?: string
  initialIsAscendingSort?: boolean
  initialGroupField?: string | null
  initialPage?: number
}) {
  listImportsRequestMock.mockResolvedValue({ rows, total })
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return render(
    <NuqsTestingAdapter>
      <QueryClientProvider client={queryClient}>
        <ImportsClient
          initialSearchQuery={initialSearchQuery}
          initialIsAscendingSort={initialIsAscendingSort}
          initialGroupField={initialGroupField}
          initialPage={initialPage}
        />
      </QueryClientProvider>
    </NuqsTestingAdapter>,
  )
}

describe("ImportsClient", () => {
  beforeEach(() => {
    listImportsRequestMock.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it("routes to the canonical create form when +Import is clicked", async () => {
    const user = userEvent.setup()

    renderImportsClient({ rows: [] })

    await user.click(screen.getByRole("button", { name: /\+ Import/ }))

    expect(navigationMocks.push).toHaveBeenCalledWith(
      "/dashboard/imports/new?returnTo=%2Fdashboard%2Ftest",
      { scroll: false },
    )
  })

  it("opens an import record when its row is clicked", async () => {
    const user = userEvent.setup()

    renderImportsClient({
      rows: [importRow({ id: "imp-7", importNumber: 7 })],
    })

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Open import IMP-0007" })).toBeTruthy()
    })

    await user.click(screen.getByRole("button", { name: "Open import IMP-0007" }))

    expect(navigationMocks.push).toHaveBeenCalledWith(
      "/dashboard/imports/imp-7?returnTo=%2Fdashboard%2Ftest",
      { scroll: false },
    )
  })
})
