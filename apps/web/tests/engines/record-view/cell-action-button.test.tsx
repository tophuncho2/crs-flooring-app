// @vitest-environment jsdom

import { afterEach, describe, it, expect, vi } from "vitest"
import { cleanup, render } from "@testing-library/react"
import { CellAddButton, CellOpenButton, FormField, TextCell } from "@/engines/record-view"

describe("CellOpenButton / CellAddButton", () => {
  afterEach(() => cleanup())

  it("fires onClick when enabled", () => {
    const onClick = vi.fn()
    const { getByRole } = render(<CellOpenButton ariaLabel="Open property" onClick={onClick} />)
    getByRole("button", { name: "Open property" }).click()
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it("stops propagation so a parent row handler does not also fire", () => {
    const onClick = vi.fn()
    const onRowClick = vi.fn()
    const { getByRole } = render(
      <div onClick={onRowClick}>
        <CellAddButton ariaLabel="New property" onClick={onClick} />
      </div>,
    )
    getByRole("button", { name: "New property" }).click()
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onRowClick).not.toHaveBeenCalled()
  })

  it("does not fire onClick when disabled", () => {
    const onClick = vi.fn()
    const { getByRole } = render(
      <CellOpenButton ariaLabel="Open property" disabled onClick={onClick} />,
    )
    const button = getByRole("button", { name: "Open property" })
    expect(button.hasAttribute("disabled")).toBe(true)
    button.click()
    expect(onClick).not.toHaveBeenCalled()
  })
})

describe("FormField actions slot", () => {
  afterEach(() => cleanup())

  it("renders label-row actions alongside the control", () => {
    const { getByRole, getByText } = render(
      <FormField label="Property" actions={<CellOpenButton ariaLabel="Open property" onClick={vi.fn()} />}>
        <TextCell editable={false} value="Maple Court" />
      </FormField>,
    )
    expect(getByText("Property")).toBeTruthy()
    expect(getByRole("button", { name: "Open property" })).toBeTruthy()
  })
})
