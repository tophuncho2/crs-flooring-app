// @vitest-environment jsdom

/**
 * Regression guard for the inventory **create** double-submit bug. `commitCreate`
 * fires `createInventory.mutate(...)`; the only UI guard is `disabled={isPending}`,
 * which react-query flips asynchronously — so two clicks in one paint frame both
 * passed the gate and inserted two rows (each with its own random idempotency key,
 * so the shared server receipt couldn't dedupe them). The fix is a synchronous
 * `useRef` latch inside `commitCreate`. These tests drive the controller directly
 * (the create client itself is picker-heavy and async); only the network boundary
 * (`createInventoryRequest`) is mocked, the real controller runs.
 */

import { afterEach, describe, expect, it, vi } from "vitest"
import type { ReactNode } from "react"
import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

const { createInventoryRequestMock } = vi.hoisted(() => ({
  createInventoryRequestMock: vi.fn(),
}))

vi.mock("@/modules/inventory/data/mutations", async () => {
  const actual = await vi.importActual<typeof import("@/modules/inventory/data/mutations")>(
    "@/modules/inventory/data/mutations",
  )
  return { ...actual, createInventoryRequest: createInventoryRequestMock }
})

import { useInventoryCreateSection } from "@/modules/inventory/controllers/record/create/use-inventory-create-section"

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

function renderCreate() {
  return renderHook(() => useInventoryCreateSection({ clearError: () => {} }), { wrapper })
}

function fillValidForm(setField: ReturnType<typeof renderCreate>["result"]["current"]["setField"]) {
  setField("productId", "prod-1")
  setField("warehouseId", "wh-1")
  setField("startingStock", "10")
}

describe("useInventoryCreateSection — double-submit guard", () => {
  afterEach(() => {
    cleanup()
    createInventoryRequestMock.mockReset()
  })

  it("two synchronous commitCreate calls fire exactly ONE create request", async () => {
    createInventoryRequestMock.mockResolvedValue({ inventory: { id: "inv-1" } })
    const { result } = renderCreate()

    act(() => fillValidForm(result.current.setField))

    const onSuccess = vi.fn()
    act(() => {
      // Two clicks in one paint frame — before react-query's isPending re-renders.
      result.current.commitCreate({ onSuccess })
      result.current.commitCreate({ onSuccess })
    })

    await waitFor(() => expect(createInventoryRequestMock).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1))
  })

  it("releases the latch after success so a deliberate second create still fires", async () => {
    createInventoryRequestMock.mockResolvedValue({ inventory: { id: "inv-1" } })
    const { result } = renderCreate()

    act(() => fillValidForm(result.current.setField))

    act(() => result.current.commitCreate({}))
    await waitFor(() => expect(createInventoryRequestMock).toHaveBeenCalledTimes(1))

    act(() => result.current.commitCreate({}))
    await waitFor(() => expect(createInventoryRequestMock).toHaveBeenCalledTimes(2))
  })
})
