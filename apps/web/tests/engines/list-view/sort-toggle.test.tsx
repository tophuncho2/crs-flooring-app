// @vitest-environment jsdom

import { afterEach, describe, it, expect, vi } from "vitest"
import { cleanup, render } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { SortToggle } from "@/engines/list-view"

describe("SortToggle", () => {
  afterEach(() => cleanup())

  it("shows the ascending label when direction is asc", () => {
    const { getByRole } = render(
      <SortToggle sortKey="name" direction="asc" onChange={vi.fn()} />,
    )
    expect(getByRole("button", { name: "Sort A-Z" })).toBeTruthy()
  })

  it("shows the descending label when direction is desc", () => {
    const { getByRole } = render(
      <SortToggle sortKey="name" direction="desc" onChange={vi.fn()} />,
    )
    expect(getByRole("button", { name: "Sort Z-A" })).toBeTruthy()
  })

  it("honors custom direction labels", () => {
    const { getByRole } = render(
      <SortToggle
        sortKey="qty"
        direction="asc"
        onChange={vi.fn()}
        ascendingLabel="1-9"
        descendingLabel="9-1"
      />,
    )
    expect(getByRole("button", { name: "Sort 1-9" })).toBeTruthy()
  })

  it("toggles asc → desc on click, preserving the sort key", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const { getByRole } = render(
      <SortToggle sortKey="name" direction="asc" onChange={onChange} />,
    )
    await user.click(getByRole("button"))
    expect(onChange).toHaveBeenCalledWith({ sortKey: "name", direction: "desc" })
  })

  it("toggles desc → asc on click", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const { getByRole } = render(
      <SortToggle sortKey="name" direction="desc" onChange={onChange} />,
    )
    await user.click(getByRole("button"))
    expect(onChange).toHaveBeenCalledWith({ sortKey: "name", direction: "asc" })
  })
})
