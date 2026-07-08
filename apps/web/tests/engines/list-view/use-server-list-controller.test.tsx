// @vitest-environment jsdom

import type { ReactNode } from "react"
import { afterEach, describe, expect, it } from "vitest"
import { act, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { NuqsTestingAdapter } from "nuqs/adapters/testing"
import { ListPreferencesUserProvider, useFetchListController } from "@/engines/list-view"
import {
  readListPreferences,
  writeListPreferences,
} from "@/engines/list-view/client/list-preferences-storage"

type Row = { id: string }
type Filters = { warehouseId?: ReadonlyArray<string> }

const TABLE_KEY = "test-main"

function makeWrapper(userId: string | null = null) {
  return function Wrapper({ children }: { children: ReactNode }) {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    })
    return (
      <NuqsTestingAdapter>
        <QueryClientProvider client={queryClient}>
          <ListPreferencesUserProvider userId={userId}>{children}</ListPreferencesUserProvider>
        </QueryClientProvider>
      </NuqsTestingAdapter>
    )
  }
}

function renderController(userId: string | null = null) {
  return renderHook(
    () =>
      useFetchListController<Row, Filters>({
        mode: "fetch",
        queryKey: ["test"],
        listFn: async () => ({ rows: [], total: 0 }),
        tableKey: TABLE_KEY,
        filterableFields: ["warehouseId"],
        initialSort: { field: "createdAt", direction: "desc" },
      }),
    { wrapper: makeWrapper(userId) },
  )
}

afterEach(() => {
  window.localStorage.clear()
})

describe("useFetchListController — sticky preferences", () => {
  it("hydrates saved filters + column widths on mount when the URL is empty", async () => {
    writeListPreferences(TABLE_KEY, {
      filters: { warehouseId: ["w1"] },
      columnWidths: { productName: 200 },
    })

    const { result } = renderController()

    await waitFor(() => {
      expect(result.current.columnWidths).toEqual({ productName: 200 })
    })
    expect(result.current.filters.warehouseId).toEqual(["w1"])
  })

  it("write-through persists column widths, and Clear All wipes the key + resets widths", async () => {
    const { result } = renderController()

    // A resize commits through the controlled seam → persisted.
    act(() => {
      result.current.onColumnWidthsChange({ productName: 260 })
    })
    await waitFor(() => {
      expect(readListPreferences(TABLE_KEY)?.columnWidths).toEqual({ productName: 260 })
    })

    // The single Clear All resets widths and removes the stored snapshot.
    act(() => {
      result.current.onClearAllFilters()
    })
    await waitFor(() => {
      expect(result.current.columnWidths).toEqual({})
    })
    expect(readListPreferences(TABLE_KEY)).toBeNull()
  })

  it("namespaces the storage key by user id when a user is present", async () => {
    const { result } = renderController("user-42")

    act(() => {
      result.current.onColumnWidthsChange({ productName: 300 })
    })

    // Stored under the per-user key, not the bare tableKey — so a shared browser
    // profile can't leak this user's list state to the next.
    await waitFor(() => {
      expect(readListPreferences(`user-42:${TABLE_KEY}`)?.columnWidths).toEqual({
        productName: 300,
      })
    })
    expect(readListPreferences(TABLE_KEY)).toBeNull()
  })
})
