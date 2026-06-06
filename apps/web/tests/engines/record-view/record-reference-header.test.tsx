// @vitest-environment jsdom

import { describe, it, expect, vi } from "vitest"
import { render, act } from "@testing-library/react"
import {
  RecordReferenceHeader,
  type RecordDetailClientScaffoldContext,
  type RecordReferenceHeaderApi,
} from "@/engines/record-view"

function fakePage(isDirty: boolean): RecordDetailClientScaffoldContext {
  return { isDirty } as unknown as RecordDetailClientScaffoldContext
}

describe("RecordReferenceHeader guard", () => {
  it("runs the action immediately when the record is clean", () => {
    let api: RecordReferenceHeaderApi | null = null
    const action = vi.fn()

    render(
      <RecordReferenceHeader page={fakePage(false)}>
        {(received) => {
          api = received
          return null
        }}
      </RecordReferenceHeader>,
    )

    act(() => api!.guard(action))
    expect(action).toHaveBeenCalledTimes(1)
  })

  it("defers the action behind the confirm dialog when the record is dirty", () => {
    let api: RecordReferenceHeaderApi | null = null
    const action = vi.fn()

    const { getByText } = render(
      <RecordReferenceHeader page={fakePage(true)}>
        {(received) => {
          api = received
          return null
        }}
      </RecordReferenceHeader>,
    )

    act(() => api!.guard(action))
    expect(action).not.toHaveBeenCalled()

    // Confirming the discard prompt runs the deferred action.
    act(() => {
      getByText("Discard").click()
    })
    expect(action).toHaveBeenCalledTimes(1)
  })
})
