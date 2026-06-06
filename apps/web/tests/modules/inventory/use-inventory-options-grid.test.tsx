// @vitest-environment jsdom

import type { ReactNode } from "react"
import { describe, it, expect } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useInventoryOptionsGrid } from "@/modules/inventory/controllers/record/header/use-inventory-options-grid"

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}

describe("useInventoryOptionsGrid", () => {
  it("resets to the first page when an identity filter changes", () => {
    // warehouseId null keeps the underlying query disabled — we're asserting the
    // pure page/filter state machine, not the fetch.
    const { result } = renderHook(
      () => useInventoryOptionsGrid({ warehouseId: null, productFilterId: null }),
      { wrapper: makeWrapper() },
    )

    act(() => result.current.goToNext())
    act(() => result.current.goToNext())
    expect(result.current.page).toBe(3)

    act(() => result.current.setRollNumber("123"))
    expect(result.current.rollNumber).toBe("123")
    expect(result.current.page).toBe(1)
  })

  it("does not advance below page 1", () => {
    const { result } = renderHook(
      () => useInventoryOptionsGrid({ warehouseId: null, productFilterId: null }),
      { wrapper: makeWrapper() },
    )

    expect(result.current.page).toBe(1)
    expect(result.current.hasPrevious).toBe(false)
    act(() => result.current.goToPrevious())
    expect(result.current.page).toBe(1)
  })
})
