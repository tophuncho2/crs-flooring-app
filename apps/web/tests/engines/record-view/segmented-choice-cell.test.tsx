// @vitest-environment jsdom

import { afterEach, describe, it, expect, vi } from "vitest"
import { cleanup, render } from "@testing-library/react"
import { SegmentedChoiceCell, type SegmentedChoiceOption } from "@/engines/record-view"

const OPTIONS: ReadonlyArray<SegmentedChoiceOption> = [
  { value: "VACANT", label: "Vacant", tone: "success" },
  { value: "OCCUPIED", label: "Occupied", tone: "warning" },
]

describe("SegmentedChoiceCell", () => {
  afterEach(() => cleanup())

  it("renders one radio per option with none pressed when value is empty", () => {
    const { getByRole } = render(
      <SegmentedChoiceCell editable value="" options={OPTIONS} onChange={vi.fn()} />,
    )
    const vacant = getByRole("radio", { name: "Vacant" })
    const occupied = getByRole("radio", { name: "Occupied" })
    expect(vacant.getAttribute("aria-checked")).toBe("false")
    expect(occupied.getAttribute("aria-checked")).toBe("false")
  })

  it("marks the matching option as checked", () => {
    const { getByRole } = render(
      <SegmentedChoiceCell editable value="OCCUPIED" options={OPTIONS} onChange={vi.fn()} />,
    )
    expect(getByRole("radio", { name: "Occupied" }).getAttribute("aria-checked")).toBe("true")
    expect(getByRole("radio", { name: "Vacant" }).getAttribute("aria-checked")).toBe("false")
  })

  it("fires onChange with the option value when a segment is clicked", () => {
    const onChange = vi.fn()
    const { getByRole } = render(
      <SegmentedChoiceCell editable value="" options={OPTIONS} onChange={onChange} />,
    )
    getByRole("radio", { name: "Vacant" }).click()
    expect(onChange).toHaveBeenCalledWith("VACANT")
  })

  it("flags the group as invalid", () => {
    const { getByRole } = render(
      <SegmentedChoiceCell editable invalid value="" options={OPTIONS} onChange={vi.fn()} />,
    )
    expect(getByRole("radiogroup").getAttribute("aria-invalid")).toBe("true")
  })

  it("renders a static badge label in read-only mode", () => {
    const { getByText, queryByRole } = render(
      <SegmentedChoiceCell editable={false} value="VACANT" options={OPTIONS} />,
    )
    expect(getByText("Vacant")).toBeTruthy()
    expect(queryByRole("radiogroup")).toBeNull()
  })

  it("renders a dash in read-only mode when nothing is selected", () => {
    const { getByText } = render(
      <SegmentedChoiceCell editable={false} value="" options={OPTIONS} />,
    )
    expect(getByText("-")).toBeTruthy()
  })
})
