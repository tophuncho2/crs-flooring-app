// @vitest-environment jsdom

import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"

const { recordPanelFooterSpy } = vi.hoisted(() => ({
  recordPanelFooterSpy: vi.fn(),
}))

vi.mock("@/features/dashboard/shared/record-view/forms/record-form", () => ({
  RecordModalShell: ({
    title,
    onClose,
    children,
    headerActions,
    sizeClass,
  }: {
    title: string
    onClose: () => void
    children: React.ReactNode
    headerActions?: React.ReactNode
    sizeClass?: string
  }) => (
    <div data-testid="record-modal-shell" data-size-class={sizeClass}>
      <h2>{title}</h2>
      <button type="button" onClick={onClose}>
        Close Shell
      </button>
      {headerActions}
      <div>{children}</div>
    </div>
  ),
}))

vi.mock("@/features/dashboard/shared/record-view/shell/record-panel-footer", () => ({
  RecordPanelFooter: (props: {
    deleteLabel: string
    deleteConfirmMessage: string
    onDelete: () => void
    onClose: () => void
    saveLabel: string
    savingLabel: string
    onSave: () => void
    isSaving?: boolean
  }) => {
    recordPanelFooterSpy(props)

    return (
      <div data-testid="record-panel-footer">
        <span>{props.deleteLabel}</span>
        <span>{props.saveLabel}</span>
        <span>{props.savingLabel}</span>
        <button type="button" onClick={props.onDelete}>
          Trigger Delete
        </button>
        <button type="button" onClick={props.onSave}>
          Trigger Save
        </button>
        <button type="button" onClick={props.onClose}>
          Trigger Close
        </button>
      </div>
    )
  },
}))

import { BasicRecordPanel } from "@/features/dashboard/shared/record-view/basic-record-panel"

describe("BasicRecordPanel", () => {
  beforeEach(() => {
    cleanup()
    recordPanelFooterSpy.mockClear()
  })

  it("renders the shared shell, notices, header actions, and children", () => {
    render(
      <BasicRecordPanel
        title="Edit Service"
        onClose={vi.fn()}
        message="Saved"
        error="Problem"
        loadingMessage="Saving"
        headerActions={<button type="button">Header Action</button>}
        saveLabel="Save Service"
        savingLabel="Saving Service"
        deleteLabel="Delete Service"
        deleteConfirmMessage="Delete this service?"
        onSave={vi.fn()}
        onDelete={vi.fn()}
        sizeClass="max-w-3xl"
      >
        <div>Panel Body</div>
      </BasicRecordPanel>,
    )

    expect(screen.getByTestId("record-modal-shell").getAttribute("data-size-class")).toBe("max-w-3xl")
    expect(screen.getByText("Edit Service")).toBeTruthy()
    expect(screen.getByText("Header Action")).toBeTruthy()
    expect(screen.getByText("Saved")).toBeTruthy()
    expect(screen.getByText("Problem")).toBeTruthy()
    expect(screen.getByText("Saving")).toBeTruthy()
    expect(screen.getByText("Panel Body")).toBeTruthy()
    expect(screen.getByTestId("record-panel-footer")).toBeTruthy()
  })

  it("wires the footer callbacks through without re-testing footer internals", () => {
    const onClose = vi.fn()
    const onSave = vi.fn()
    const onDelete = vi.fn()

    render(
      <BasicRecordPanel
        title="Edit Manufacturer"
        onClose={onClose}
        saveLabel="Save Manufacturer"
        savingLabel="Saving Manufacturer"
        deleteLabel="Delete Manufacturer"
        deleteConfirmMessage="Delete this manufacturer?"
        onSave={onSave}
        onDelete={onDelete}
        isSaving
      >
        <div>Body</div>
      </BasicRecordPanel>,
    )

    expect(recordPanelFooterSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        deleteLabel: "Delete Manufacturer",
        saveLabel: "Save Manufacturer",
        savingLabel: "Saving Manufacturer",
        deleteConfirmMessage: "Delete this manufacturer?",
        isSaving: true,
      }),
    )

    fireEvent.click(screen.getAllByRole("button", { name: "Trigger Delete" })[0])
    fireEvent.click(screen.getAllByRole("button", { name: "Trigger Save" })[0])
    fireEvent.click(screen.getAllByRole("button", { name: "Trigger Close" })[0])
    fireEvent.click(screen.getAllByRole("button", { name: "Close Shell" })[0])

    expect(onDelete).toHaveBeenCalledTimes(1)
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})
