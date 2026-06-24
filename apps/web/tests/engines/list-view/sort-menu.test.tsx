// @vitest-environment jsdom

import { afterEach, describe, it, expect, vi } from "vitest"
import { cleanup, render } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { SortMenu } from "@/engines/list-view"

const OPTIONS = [
  { key: "scheduledFor", label: "Date" },
  { key: "entity", label: "Entity" },
  { key: "property", label: "Property" },
  { key: "createdAt", label: "Created" },
]

describe("SortMenu", () => {
  afterEach(() => cleanup())

  it("shows the active-level count badge and opens the panel", async () => {
    const user = userEvent.setup()
    const { getByRole, getByText } = render(
      <SortMenu
        options={OPTIONS}
        value={[{ field: "scheduledFor", direction: "desc" }]}
        maxLevels={3}
        onChange={vi.fn()}
      />,
    )
    expect(getByText("1")).toBeTruthy()
    await user.click(getByRole("button", { name: "Sort" }))
    expect(getByText("Sort by")).toBeTruthy()
  })

  it("appends the first unused column via Add level", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const { getByRole, getByText } = render(
      <SortMenu
        options={OPTIONS}
        value={[{ field: "scheduledFor", direction: "desc" }]}
        maxLevels={3}
        onChange={onChange}
      />,
    )
    await user.click(getByRole("button", { name: "Sort" }))
    await user.click(getByText(/Add level/))
    expect(onChange).toHaveBeenCalledWith([
      { field: "scheduledFor", direction: "desc" },
      { field: "entity", direction: "asc" },
    ])
  })

  it("removes a level", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const { getByRole, getByLabelText } = render(
      <SortMenu
        options={OPTIONS}
        value={[
          { field: "scheduledFor", direction: "desc" },
          { field: "entity", direction: "asc" },
        ]}
        maxLevels={3}
        onChange={onChange}
      />,
    )
    await user.click(getByRole("button", { name: "Sort" }))
    await user.click(getByLabelText("Remove Entity from sort"))
    expect(onChange).toHaveBeenCalledWith([{ field: "scheduledFor", direction: "desc" }])
  })

  it("toggles a level's direction", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const { getByRole, getByLabelText } = render(
      <SortMenu
        options={OPTIONS}
        value={[{ field: "scheduledFor", direction: "desc" }]}
        maxLevels={3}
        onChange={onChange}
      />,
    )
    await user.click(getByRole("button", { name: "Sort" }))
    await user.click(getByLabelText("Toggle direction for Date"))
    expect(onChange).toHaveBeenCalledWith([{ field: "scheduledFor", direction: "asc" }])
  })

  it("hides Add level once the max is reached", async () => {
    const user = userEvent.setup()
    const { getByRole, queryByText } = render(
      <SortMenu
        options={OPTIONS}
        value={[
          { field: "scheduledFor", direction: "desc" },
          { field: "entity", direction: "asc" },
        ]}
        maxLevels={2}
        onChange={vi.fn()}
      />,
    )
    await user.click(getByRole("button", { name: "Sort" }))
    expect(queryByText(/Add level/)).toBeNull()
  })
})
