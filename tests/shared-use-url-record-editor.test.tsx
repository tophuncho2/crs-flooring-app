// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest"
import { act, renderHook } from "@testing-library/react"

const { panelState } = vi.hoisted(() => ({
  panelState: {
    activeRecordId: null as string | null,
    openRecord: vi.fn(),
    closeRecord: vi.fn(),
  },
}))

vi.mock("@/features/flooring/shared/use-url-record-panel", () => ({
  useUrlRecordPanel: () => ({
    activeRecordId: panelState.activeRecordId,
    openRecord: panelState.openRecord,
    closeRecord: panelState.closeRecord,
  }),
}))

import { useUrlRecordEditor } from "@/features/flooring/shared/use-url-record-editor"

type Row = { id: string; name: string }
type Draft = { name: string }

const rows: Row[] = [
  { id: "row-1", name: "Alpha" },
  { id: "row-2", name: "Beta" },
]

describe("useUrlRecordEditor", () => {
  beforeEach(() => {
    panelState.activeRecordId = null
    panelState.openRecord.mockReset()
    panelState.closeRecord.mockReset()
  })

  it("resolves the active record from rows and builds the default draft from createDraft", () => {
    panelState.activeRecordId = "row-2"
    const createDraft = vi.fn((row: Row) => ({ name: row.name }))

    const { result } = renderHook(() =>
      useUrlRecordEditor<Row, Draft>({
        rows,
        paramKey: "record",
        createDraft,
      }),
    )

    expect(result.current.activeRecord).toEqual({ id: "row-2", name: "Beta" })
    expect(result.current.draft).toEqual({ name: "Beta" })
    expect(createDraft).toHaveBeenCalledWith({ id: "row-2", name: "Beta" })
  })

  it("opens a record by seeding the draft and delegating to the URL panel", () => {
    const createDraft = vi.fn((row: Row) => ({ name: `${row.name} draft` }))
    const { result, rerender } = renderHook(() =>
      useUrlRecordEditor<Row, Draft>({
        rows,
        paramKey: "record",
        createDraft,
      }),
    )

    act(() => {
      result.current.openRecord(rows[0])
    })

    expect(panelState.openRecord).toHaveBeenCalledWith("row-1")

    panelState.activeRecordId = "row-1"
    rerender()

    expect(result.current.activeRecord).toEqual(rows[0])
    expect(result.current.draft).toEqual({ name: "Alpha draft" })
  })

  it("updates the draft in active-record mode", () => {
    panelState.activeRecordId = "row-1"

    const { result } = renderHook(() =>
      useUrlRecordEditor<Row, Draft>({
        rows,
        paramKey: "record",
        createDraft: (row) => ({ name: row.name }),
      }),
    )

    act(() => {
      result.current.setDraft({ name: "Edited Alpha" })
    })

    expect(result.current.draft).toEqual({ name: "Edited Alpha" })
  })

  it("stores a create-mode draft when no record is active", () => {
    const { result } = renderHook(() =>
      useUrlRecordEditor<Row, Draft>({
        rows,
        paramKey: "record",
        createDraft: (row) => ({ name: row.name }),
      }),
    )

    act(() => {
      result.current.setDraft({ name: "New Draft" })
    })

    expect(result.current.activeRecord).toBeNull()
    expect(result.current.draft).toEqual({ name: "New Draft" })
  })

  it("clears draft state and delegates close back to the URL panel", () => {
    panelState.activeRecordId = "row-1"
    const { result, rerender } = renderHook(() =>
      useUrlRecordEditor<Row, Draft>({
        rows,
        paramKey: "record",
        createDraft: (row) => ({ name: row.name }),
      }),
    )

    act(() => {
      result.current.setDraft({ name: "Edited Alpha" })
    })

    act(() => {
      result.current.closeRecord()
    })

    expect(panelState.closeRecord).toHaveBeenCalledTimes(1)

    panelState.activeRecordId = null
    rerender()

    expect(result.current.activeRecord).toBeNull()
    expect(result.current.draft).toBeNull()
  })
})
