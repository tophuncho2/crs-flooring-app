// @vitest-environment jsdom

import type { ReactNode } from "react"
import { describe, it, expect } from "vitest"
import { renderHook, act, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useInventoryOptionsGrid } from "@/modules/inventory/controllers/record/header/use-inventory-options-grid"

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}

/** Stub fetcher returning enough total to paginate (100 / 15 = 7 pages). */
const stubRequest = async () => ({ rows: [], total: 100 })

describe("useInventoryOptionsGrid", () => {
  it("resets to the first page when an identity filter changes", async () => {
    const { result } = renderHook(
      () =>
        useInventoryOptionsGrid({
          warehouseId: null,
          productFilterId: null,
          enabled: true,
          requestFn: stubRequest,
        }),
      { wrapper: makeWrapper() },
    )

    // Wait for the stub total to land so the engine derives >1 page.
    await waitFor(() => expect(result.current.pagination.totalPages).toBe(7))

    act(() => result.current.pagination.onNextPage())
    act(() => result.current.pagination.onNextPage())
    expect(result.current.pagination.page).toBe(3)

    act(() => result.current.setRollNumber("123"))
    expect(result.current.rollNumber).toBe("123")
    expect(result.current.pagination.page).toBe(1)
  })

  it("flips archive scope via internal state and resets to the first page", async () => {
    const { result } = renderHook(
      () =>
        useInventoryOptionsGrid({
          warehouseId: null,
          productFilterId: null,
          enabled: true,
          requestFn: stubRequest,
        }),
      { wrapper: makeWrapper() },
    )

    await waitFor(() => expect(result.current.pagination.totalPages).toBe(7))
    expect(result.current.isArchived).toBe(false)

    act(() => result.current.pagination.onNextPage())
    act(() => result.current.pagination.onNextPage())
    expect(result.current.pagination.page).toBe(3)

    act(() => result.current.setIsArchived(true))
    expect(result.current.isArchived).toBe(true)
    expect(result.current.pagination.page).toBe(1)
  })

  it("does not advance below page 1", () => {
    const { result } = renderHook(
      () =>
        useInventoryOptionsGrid({
          warehouseId: null,
          productFilterId: null,
          enabled: false,
        }),
      { wrapper: makeWrapper() },
    )

    expect(result.current.pagination.page).toBe(1)
    expect(result.current.pagination.hasPreviousPage).toBe(false)
    act(() => result.current.pagination.onPreviousPage())
    expect(result.current.pagination.page).toBe(1)
  })
})
