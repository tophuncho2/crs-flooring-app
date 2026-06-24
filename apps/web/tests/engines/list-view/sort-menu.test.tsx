// @vitest-environment jsdom

import { afterEach, describe, it, expect, vi } from "vitest"
import { cleanup, render } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { SortMenuBody } from "@/engines/list-view"

const OPTIONS = [
  { key: "scheduledFor", label: "Date" },
  { key: "entity", label: "Entity" },
  { key: "property", label: "Property" },
  { key: "createdAt", label: "Created" },
]

describe("SortMenuBody", () => {
  afterEach(() => cleanup())

  it("renders the sort builder body with the active level", () => {
    const { getByText, getByLabelText } = render(
      <SortMenuBody
        options={OPTIONS}
        value={[{ field: "scheduledFor", direction: "desc" }]}
        maxLevels={3}
        onChange={vi.fn()}
      />,
    )
    expect(getByText("Sort by")).toBeTruthy()
    // The single active level exposes its direction toggle.
    expect(getByLabelText("Toggle direction for Date")).toBeTruthy()
  })

  it("appends the first unused column via Add level", async () => {
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
    await user.click(getByText(/Add level/))
    expect(onChange).toHaveBeenCalledWith([
      { field: "scheduledFor", direction: "desc" },
      { field: "entity", direction: "asc" },
    ])
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
    await user.click(getByLabelText("Toggle direction for Date"))
    expect(onChange).toHaveBeenCalledWith([{ field: "scheduledFor", direction: "asc" }])
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

  it("hides Add level once the max is reached", () => {
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
    expect(queryByText(/Add level/)).toBeNull()
  })
})
