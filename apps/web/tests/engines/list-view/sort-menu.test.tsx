// @vitest-environment jsdom

import { afterEach, describe, it, expect, vi } from "vitest"
import { cleanup, render } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { SortMenuBody, type SortMenuOption } from "@/engines/list-view"

const OPTIONS: SortMenuOption[] = [
  { key: "scheduledFor", label: "Date", type: "date" },
  { key: "entity", label: "Entity", type: "text" },
  { key: "property", label: "Property", type: "text" },
  { key: "stock", label: "Stock", type: "number" },
]

describe("SortMenuBody", () => {
  afterEach(() => cleanup())

  it("renders the active level's field select + direction control (the title lives in the panel header)", () => {
    const { getByLabelText, queryByText } = render(
      <SortMenuBody
        options={OPTIONS}
        value={[{ field: "scheduledFor", direction: "desc" }]}
        maxLevels={3}
        onChange={vi.fn()}
      />,
    )
    expect(getByLabelText("Sort column 1")).toBeTruthy()
    // Date + desc → the type-aware "Newest" label, not "Desc".
    expect(getByLabelText(/Direction for Date/)).toBeTruthy()
    expect(queryByText("Newest")).toBeTruthy()
    // The body no longer renders its own "Sort by" heading (moved to the sticky header).
    expect(queryByText("Sort by")).toBeNull()
  })

  it("offers an empty-state CTA that adds the first column at its default direction", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const { getByText } = render(
      <SortMenuBody options={OPTIONS} value={[]} maxLevels={3} onChange={onChange} />,
    )
    await user.click(getByText("Add a sort column"))
    // scheduledFor is a date → defaults to desc (newest first).
    expect(onChange).toHaveBeenCalledWith([{ field: "scheduledFor", direction: "desc" }])
  })

  it("appends the first unused column via Add another column", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const { getByText } = render(
      <SortMenuBody
        options={OPTIONS}
        value={[{ field: "scheduledFor", direction: "desc" }]}
        maxLevels={3}
        onChange={onChange}
      />,
    )
    await user.click(getByText("Add another column"))
    // entity is text → defaults to asc.
    expect(onChange).toHaveBeenCalledWith([
      { field: "scheduledFor", direction: "desc" },
      { field: "entity", direction: "asc" },
    ])
  })

  it("toggles a level's direction", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const { getByLabelText } = render(
      <SortMenuBody
        options={OPTIONS}
        value={[{ field: "scheduledFor", direction: "desc" }]}
        maxLevels={3}
        onChange={onChange}
      />,
    )
    await user.click(getByLabelText(/Direction for Date/))
    expect(onChange).toHaveBeenCalledWith([{ field: "scheduledFor", direction: "asc" }])
  })

  it("labels direction by the column's value type", () => {
    const { getByLabelText } = render(
      <SortMenuBody
        options={OPTIONS}
        value={[{ field: "stock", direction: "desc" }]}
        maxLevels={3}
        onChange={vi.fn()}
      />,
    )
    // number + desc → "High → Low".
    expect(getByLabelText("Direction for Stock: High → Low. Toggle.")).toBeTruthy()
  })

  it("reorders priority via the move-down control", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const { getByLabelText } = render(
      <SortMenuBody
        options={OPTIONS}
        value={[
          { field: "scheduledFor", direction: "desc" },
          { field: "entity", direction: "asc" },
        ]}
        maxLevels={3}
        onChange={onChange}
      />,
    )
    await user.click(getByLabelText("Move Date down"))
    expect(onChange).toHaveBeenCalledWith([
      { field: "entity", direction: "asc" },
      { field: "scheduledFor", direction: "desc" },
    ])
  })

  it("disables move-up on the first level and move-down on the last", () => {
    const { getByLabelText } = render(
      <SortMenuBody
        options={OPTIONS}
        value={[
          { field: "scheduledFor", direction: "desc" },
          { field: "entity", direction: "asc" },
        ]}
        maxLevels={3}
        onChange={vi.fn()}
      />,
    )
    expect((getByLabelText("Move Date up") as HTMLButtonElement).disabled).toBe(true)
    expect((getByLabelText("Move Entity down") as HTMLButtonElement).disabled).toBe(true)
  })

  it("removes a level", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const { getByLabelText } = render(
      <SortMenuBody
        options={OPTIONS}
        value={[
          { field: "scheduledFor", direction: "desc" },
          { field: "entity", direction: "asc" },
        ]}
        maxLevels={3}
        onChange={onChange}
      />,
    )
    await user.click(getByLabelText("Remove Entity from sort"))
    expect(onChange).toHaveBeenCalledWith([{ field: "scheduledFor", direction: "desc" }])
  })

  it("clears all levels", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const { getByText } = render(
      <SortMenuBody
        options={OPTIONS}
        value={[{ field: "scheduledFor", direction: "desc" }]}
        maxLevels={3}
        onChange={onChange}
      />,
    )
    await user.click(getByText("Clear"))
    expect(onChange).toHaveBeenCalledWith([])
  })

  it("hides Add another column once the max is reached", () => {
    const { queryByText } = render(
      <SortMenuBody
        options={OPTIONS}
        value={[
          { field: "scheduledFor", direction: "desc" },
          { field: "entity", direction: "asc" },
        ]}
        maxLevels={2}
        onChange={vi.fn()}
      />,
    )
    expect(queryByText(/Add another/)).toBeNull()
  })
})
