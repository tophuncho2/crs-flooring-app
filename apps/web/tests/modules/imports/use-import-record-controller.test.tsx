// @vitest-environment jsdom

/**
 * Coverage for the imports record controller's queued→imported poll state
 * machine — the branchiest new code in the controller and previously untested.
 *
 * The worker flips a staged row QUEUED → IMPORTED in the DB WITHOUT bumping the
 * parent import, so nothing changes client-side until the controller re-reads.
 * It polls the read-only rows endpoint (`fetchImportStagedInventoryRequest`)
 * every 3s while any row is QUEUED, reconciles each tick, and gives up after a
 * bounded `MAX_IMPORT_POLL_TICKS` (=40, ~2 min) so a stuck worker can't spin it
 * forever. Only that network boundary is mocked; the real controller runs.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { ReactNode } from "react"
import { act, cleanup, renderHook } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type {
  FlooringStagedRowStatus,
  ImportDetail,
  StagedInventoryFilterRow,
  StagedInventoryRow,
} from "@builders/domain"
import type { RecordDetailClientScaffoldContext } from "@/engines/record-view"

const { fetchImportStagedInventoryRequestMock } = vi.hoisted(() => ({
  fetchImportStagedInventoryRequestMock: vi.fn(),
}))

vi.mock("@/modules/imports/data/mutations", async () => {
  const actual = await vi.importActual<typeof import("@/modules/imports/data/mutations")>(
    "@/modules/imports/data/mutations",
  )
  return { ...actual, fetchImportStagedInventoryRequest: fetchImportStagedInventoryRequestMock }
})

import { useImportRecordController } from "@/modules/imports/controllers/record/use-import-record-controller"

// --- Fixtures --------------------------------------------------------------

function makeImport(overrides: Partial<ImportDetail> = {}): ImportDetail {
  return {
    id: "imp-1",
    importNumber: 1,
    purchaseOrderNumber: "PO-1",
    internalNotes: "",
    warehouseId: "wh-1",
    warehouseName: "WH",
    stagedInventoryRowsCount: 0,
    liveInventoryRowsCount: 0,
    createdAt: "2026-06-24T00:00:00.000Z",
    updatedAt: "2026-06-24T00:00:00.000Z",
    createdBy: "tester",
    updatedBy: "tester",
    stagedInventoryRows: [],
    inventories: [],
    previousImport: null,
    nextImport: null,
    ...overrides,
  }
}

function makeStaged(
  id: string,
  status: FlooringStagedRowStatus,
  overrides: Partial<StagedInventoryRow> = {},
): StagedInventoryRow {
  return {
    id,
    importEntryId: "imp-1",
    importNumber: 1,
    productId: "prod-1",
    productName: "Product",
    categoryId: "cat-1",
    unitName: "Square Feet",
    unitAbbrev: "sqft",
    rollPrefix: "ROLL#",
    rollNumber: "1",
    dyeLot: "",
    warehouseId: "wh-1",
    warehouseName: "WH",
    location: "",
    startingStock: "10",
    cost: "1.00",
    freight: "0.00",
    status,
    note: "",
    createdAt: "2026-06-24T00:00:00.000Z",
    updatedAt: "2026-06-24T00:00:00.000Z",
    ...overrides,
  }
}

function makeFilter(id: string, overrides: Partial<StagedInventoryFilterRow> = {}): StagedInventoryFilterRow {
  return {
    id,
    importEntryId: "imp-1",
    categoryFilterName: null,
    productId: "prod-1",
    productName: "Product",
    categoryId: "cat-1",
    stockOrdered: "",
    unitName: "Square Feet",
    unitAbbrev: "sqft",
    startingStockSum: "0.00",
    remainingStock: "",
    createdAt: "2026-06-24T00:00:00.000Z",
    updatedAt: "2026-06-24T00:00:00.000Z",
    ...overrides,
  }
}

// `page` methods are never invoked on mount (manageDirtySections:false), so a
// no-op stub is enough for the poll-only flows under test.
function makePage(): RecordDetailClientScaffoldContext {
  return {
    notices: { showSuccess: vi.fn(), showError: vi.fn() },
    setDirtySections: vi.fn(),
    redirectToBack: vi.fn(),
    confirmNavigation: (action: () => void) => action(),
  } as unknown as RecordDetailClientScaffoldContext
}

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

function renderController(args: {
  initialStagedRows: StagedInventoryRow[]
  initialFilterRows?: StagedInventoryFilterRow[]
}) {
  return renderHook(
    () =>
      useImportRecordController({
        page: makePage(),
        entry: makeImport(),
        initialFilterRows: args.initialFilterRows ?? [],
        initialStagedRows: args.initialStagedRows,
      }),
    { wrapper },
  )
}

// Advance N poll intervals, flushing the async refresh + React updates each tick.
async function tickPoll(times: number) {
  for (let i = 0; i < times; i += 1) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3100)
    })
  }
}

describe("useImportRecordController — queued→imported poll", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    fetchImportStagedInventoryRequestMock.mockReset()
  })

  it("does NOT poll when no row is QUEUED", async () => {
    const { result } = renderController({
      initialStagedRows: [makeStaged("r1", "DRAFT"), makeStaged("r2", "IMPORTED")],
    })

    await tickPoll(3)

    expect(fetchImportStagedInventoryRequestMock).not.toHaveBeenCalled()
    expect(result.current.pollExhausted).toBe(false)
  })

  it("flips a QUEUED row to IMPORTED on a poll tick, then stops polling", async () => {
    fetchImportStagedInventoryRequestMock.mockResolvedValue({
      filterRows: [],
      stagedRows: [makeStaged("r1", "IMPORTED")],
    })
    const { result } = renderController({ initialStagedRows: [makeStaged("r1", "QUEUED")] })

    await tickPoll(1)
    expect(result.current.stagedRows.find((row) => row.id === "r1")?.status).toBe("IMPORTED")

    // No row is QUEUED anymore → the poll must stop (no further reads).
    await tickPoll(3)
    expect(fetchImportStagedInventoryRequestMock).toHaveBeenCalledTimes(1)
  })

  it("reconciles BOTH row arrays in place from the poll response", async () => {
    fetchImportStagedInventoryRequestMock.mockResolvedValue({
      filterRows: [makeFilter("f1"), makeFilter("f2")],
      stagedRows: [makeStaged("r1", "IMPORTED")],
    })
    const { result } = renderController({
      initialStagedRows: [makeStaged("r1", "QUEUED")],
      initialFilterRows: [makeFilter("f1")],
    })

    await tickPoll(1)

    expect(result.current.filterRows.map((row) => row.id)).toEqual(["f1", "f2"])
    expect(result.current.stagedRows.find((row) => row.id === "r1")?.status).toBe("IMPORTED")
  })

  it("gives up after MAX_IMPORT_POLL_TICKS (40) when the worker stays stuck", async () => {
    // Worker never advances — row stays QUEUED every read.
    fetchImportStagedInventoryRequestMock.mockResolvedValue({
      filterRows: [],
      stagedRows: [makeStaged("r1", "QUEUED")],
    })
    const { result } = renderController({ initialStagedRows: [makeStaged("r1", "QUEUED")] })

    // 40 ticks read; the 41st trips the bound and stops (no read).
    await tickPoll(45)

    expect(fetchImportStagedInventoryRequestMock).toHaveBeenCalledTimes(40)
    expect(result.current.pollExhausted).toBe(true)

    // Exhausted → no further reads even as time advances.
    await tickPoll(5)
    expect(fetchImportStagedInventoryRequestMock).toHaveBeenCalledTimes(40)
  })
})
