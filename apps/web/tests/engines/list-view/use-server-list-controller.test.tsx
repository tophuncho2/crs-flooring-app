// @vitest-environment jsdom

import type { ReactNode } from "react"
import { afterEach, describe, expect, it } from "vitest"
import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
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
        allowedSortFields: ["createdAt", "name"],
        maxSortLevels: 3,
      }),
    { wrapper: makeWrapper(userId) },
  )
}

afterEach(() => {
  // Unmount rendered controllers FIRST. `globals` is off in vitest.config, so RTL
  // never auto-registers `cleanup()` — without this, each `renderHook` controller
  // stays mounted as a live nuqs subscriber. A later test's Clear-all now clears
  // sort/page through the nuqs setters (which correctly notify subscribers), and
  // that URL change would wake a zombie controller whose write-through re-persists
  // its stale snapshot into localStorage after we clear it below.
  cleanup()
  window.localStorage.clear()
  // Controllers mirror filters to the URL via history.replaceState; jsdom keeps
  // window.location across tests, so reset it or a later test's hydration guard
  // sees a stale `?param` and skips (URL-with-params wins).
  window.history.replaceState(null, "", "/")
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

  it("durably restores a non-default sort into the menu state, not just the URL", async () => {
    // Regression: the Sort menu + Clear button read `sorts`/`hasNonDefaultSort`.
    // Hydrating the sort via a raw replaceState left the URL correct but nuqs
    // reverted, so the menu showed the default. Replaying via the nuqs setter
    // must land the sort in the derived state the UI actually reads.
    writeListPreferences(TABLE_KEY, { sorts: [{ field: "name", direction: "asc" }] })

    const { result } = renderController()

    await waitFor(() => {
      expect(result.current.hasNonDefaultSort).toBe(true)
    })
    expect(result.current.sorts).toEqual([{ field: "name", direction: "asc" }])
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
