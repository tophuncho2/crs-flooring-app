// @vitest-environment jsdom

import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { RecordPanelFooter } from "@/engines/record-view/shell/record-panel-footer"

describe("RecordPanelFooter", () => {
  beforeEach(() => {
    cleanup()
  })

  it("does not call onDelete when the delete confirmation is cancelled", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false)
    const onDelete = vi.fn()

    render(
      <RecordPanelFooter
        deleteLabel="Delete Record"
        deleteConfirmMessage="Delete this record?"
        onDelete={onDelete}
        onClose={vi.fn()}
        saveLabel="Save Record"
        savingLabel="Saving Record"
        onSave={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: "Delete Record" }))

    expect(window.confirm).toHaveBeenCalledWith("Delete this record?")
    expect(onDelete).not.toHaveBeenCalled()
  })

  it("calls onDelete after the delete confirmation succeeds", () => {
    vi.spyOn(window, "confirm").mockReturnValue(true)
    const onDelete = vi.fn()

    render(
      <RecordPanelFooter
        deleteLabel="Delete Record"
        deleteConfirmMessage="Delete this record?"
        onDelete={onDelete}
        onClose={vi.fn()}
        saveLabel="Save Record"
        savingLabel="Saving Record"
        onSave={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: "Delete Record" }))

    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  it("renders leftExtra content and disables close plus save while saving", () => {
    const onSave = vi.fn()
    const onClose = vi.fn()

    render(
      <RecordPanelFooter
        deleteLabel="Delete Record"
        deleteConfirmMessage="Delete this record?"
        onDelete={vi.fn()}
        onClose={onClose}
        saveLabel="Save Record"
        savingLabel="Saving Record"
        onSave={onSave}
        isSaving
        leftExtra={<span>Footer Meta</span>}
      />,
    )

    const closeButton = screen.getByRole("button", { name: "Close" }) as HTMLButtonElement
    const saveButton = screen.getByRole("button", { name: "Saving Record" }) as HTMLButtonElement

    expect(screen.getByText("Footer Meta")).toBeTruthy()
    expect(closeButton.disabled).toBe(true)
    expect(saveButton.disabled).toBe(true)

    fireEvent.click(closeButton)
    fireEvent.click(saveButton)

    expect(onClose).not.toHaveBeenCalled()
    expect(onSave).not.toHaveBeenCalled()
  })
})
