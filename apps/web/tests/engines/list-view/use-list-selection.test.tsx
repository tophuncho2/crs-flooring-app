// @vitest-environment jsdom

import { describe, it, expect } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useListSelection } from "@/engines/list-view"

describe("useListSelection", () => {
  it("toggles a single row in and out of the selection", () => {
    const { result } = renderHook(() => useListSelection())

    act(() => result.current.toggle("a"))
    expect(result.current.isSelected("a")).toBe(true)
    expect(result.current.selectedCount).toBe(1)

    act(() => result.current.toggle("a"))
    expect(result.current.isSelected("a")).toBe(false)
    expect(result.current.selectedCount).toBe(0)
  })

  it("selects all page-eligible ids, then clears them on a second toggleAll", () => {
    const { result } = renderHook(() => useListSelection())
    const page = ["a", "b", "c"]

    act(() => result.current.toggleAll(page))
    expect(result.current.selectedCount).toBe(3)

    act(() => result.current.toggleAll(page))
    expect(result.current.selectedCount).toBe(0)
  })

  it("toggleAll adds the page when only some of it is already selected", () => {
    const { result } = renderHook(() => useListSelection())

    act(() => result.current.toggle("a"))
    act(() => result.current.toggleAll(["a", "b", "c"]))
    expect(result.current.selectedCount).toBe(3)
  })

  it("preserves selections from other pages when toggling a new page", () => {
    const { result } = renderHook(() => useListSelection())

    act(() => result.current.toggleAll(["a", "b"]))
    act(() => result.current.toggleAll(["c", "d"]))
    expect(result.current.selectedCount).toBe(4)
  })

  it("clear() drops the whole selection", () => {
    const { result } = renderHook(() => useListSelection())

    act(() => result.current.toggleAll(["a", "b"]))
    act(() => result.current.clear())
    expect(result.current.selectedCount).toBe(0)
  })
})
