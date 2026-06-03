// @vitest-environment jsdom

import { describe, it, expect, vi } from "vitest"
import { renderHook, act, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createElement, type ReactNode } from "react"
import { useSidePanelFreshness } from "@/engines/side-panel"

const DETAIL = ["inventory", "detail", "inv-1"] as const
const CHILD = ["inventory", "adjustments", "inv-1"] as const

function makeWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client }, children)
  }
}

function setup(config: Parameters<typeof useSidePanelFreshness>[0]) {
  const client = new QueryClient()
  const spy = vi.spyOn(client, "invalidateQueries").mockResolvedValue(undefined)
  const view = renderHook(() => useSidePanelFreshness(config), {
    wrapper: makeWrapper(client),
  })
  return { client, spy, view }
}

describe("useSidePanelFreshness", () => {
  it("invalidateRegistered invalidates detail + every child key", () => {
    const { spy, view } = setup({ detail: [...DETAIL], children: [[...CHILD]] })

    act(() => view.result.current.invalidateRegistered())

    expect(spy).toHaveBeenCalledTimes(2)
    expect(spy).toHaveBeenCalledWith({ queryKey: [...DETAIL] })
    expect(spy).toHaveBeenCalledWith({ queryKey: [...CHILD] })
  })

  it("invalidateRegistered with only children invalidates each child key", () => {
    const { spy, view } = setup({ children: [[...CHILD]] })

    act(() => view.result.current.invalidateRegistered())

    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith({ queryKey: [...CHILD] })
  })

  it("refreshAll refetches all keys and toggles isRefreshing", async () => {
    const client = new QueryClient()
    let release: () => void = () => {}
    const pending = new Promise<void>((resolve) => {
      release = resolve
    })
    const spy = vi.spyOn(client, "invalidateQueries").mockReturnValue(pending as never)
    const view = renderHook(
      () => useSidePanelFreshness({ detail: [...DETAIL], children: [[...CHILD]] }),
      { wrapper: makeWrapper(client) },
    )

    expect(view.result.current.isRefreshing).toBe(false)

    act(() => view.result.current.refreshAll())

    expect(spy).toHaveBeenCalledTimes(2)
    expect(view.result.current.isRefreshing).toBe(true)

    await act(async () => {
      release()
      await pending
    })

    await waitFor(() => expect(view.result.current.isRefreshing).toBe(false))
  })

  it("is a no-op when nothing is registered", () => {
    const { spy, view } = setup({})

    act(() => view.result.current.refreshAll())
    act(() => view.result.current.invalidateRegistered())

    expect(spy).not.toHaveBeenCalled()
    expect(view.result.current.isRefreshing).toBe(false)
  })

  it("keeps callback identity stable across re-renders with value-equal keys", () => {
    const client = new QueryClient()
    vi.spyOn(client, "invalidateQueries").mockResolvedValue(undefined)
    // Build fresh key arrays every render (mirrors callers that spread inline),
    // so this genuinely exercises the serialized-signature stabilization.
    const view = renderHook(
      ({ id }: { id: string }) =>
        useSidePanelFreshness({
          detail: ["inventory", "detail", id],
          children: [["inventory", "adjustments", id]],
        }),
      { wrapper: makeWrapper(client), initialProps: { id: "inv-1" } },
    )
    const first = view.result.current.invalidateRegistered

    view.rerender({ id: "inv-1" }) // same value, brand-new arrays
    expect(view.result.current.invalidateRegistered).toBe(first)

    view.rerender({ id: "inv-2" }) // different value → new identity
    expect(view.result.current.invalidateRegistered).not.toBe(first)
  })
})
