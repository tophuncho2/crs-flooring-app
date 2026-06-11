// @vitest-environment jsdom

import { describe, it, expect, vi } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useRecordSwapGuard } from "@/engines/record-view"

describe("useRecordSwapGuard", () => {
  it("runs the action immediately when the record is clean", () => {
    const action = vi.fn()
    const { result } = renderHook(() => useRecordSwapGuard({ isDirty: false }))

    act(() => result.current.guard(action))

    expect(action).toHaveBeenCalledTimes(1)
    expect(result.current.dialogProps.open).toBe(false)
  })

  it("defers the action behind the confirm dialog when the record is dirty", () => {
    const action = vi.fn()
    const { result } = renderHook(() => useRecordSwapGuard({ isDirty: true }))

    act(() => result.current.guard(action))

    expect(action).not.toHaveBeenCalled()
    expect(result.current.dialogProps.open).toBe(true)
  })

  it("runs the deferred action when the discard prompt is confirmed", () => {
    const action = vi.fn()
    const { result } = renderHook(() => useRecordSwapGuard({ isDirty: true }))

    act(() => result.current.guard(action))
    act(() => result.current.dialogProps.onConfirm())

    expect(action).toHaveBeenCalledTimes(1)
    expect(result.current.dialogProps.open).toBe(false)
  })

  it("drops the deferred action when the discard prompt is cancelled", () => {
    const action = vi.fn()
    const { result } = renderHook(() => useRecordSwapGuard({ isDirty: true }))

    act(() => result.current.guard(action))
    act(() => result.current.dialogProps.onCancel())

    expect(action).not.toHaveBeenCalled()
    expect(result.current.dialogProps.open).toBe(false)
  })

  it("surfaces a custom discard message on the dialog props", () => {
    const { result } = renderHook(() =>
      useRecordSwapGuard({ isDirty: true, discardMessage: "Stepping away discards them." }),
    )

    expect(result.current.dialogProps.message).toBe("Stepping away discards them.")
  })
})
