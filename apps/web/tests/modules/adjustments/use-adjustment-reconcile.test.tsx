// @vitest-environment jsdom

import type { ReactNode } from "react"
import { describe, it, expect, beforeEach, vi } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useAdjustmentReconcile } from "@/modules/adjustments/controllers/use-adjustment-reconcile"
import { navigationMocks, resetNavigationMocks } from "../../helpers/next-navigation-mock"

function makeHarness() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const invalidateSpy = vi.spyOn(client, "invalidateQueries").mockResolvedValue()
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return { wrapper, invalidateSpy }
}

describe("useAdjustmentReconcile", () => {
  beforeEach(() => {
    resetNavigationMocks()
  })

  it("invalidates every adjustment-affected cache root and refreshes the server", () => {
    const { wrapper, invalidateSpy } = makeHarness()
    const { result } = renderHook(() => useAdjustmentReconcile(), { wrapper })

    act(() => result.current())

    for (const root of ["inventory", "adjustments", "work-orders"]) {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: [root] })
    }
    expect(navigationMocks.refresh).toHaveBeenCalledTimes(1)
  })
})
