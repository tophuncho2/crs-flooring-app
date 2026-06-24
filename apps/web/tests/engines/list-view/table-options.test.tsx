// @vitest-environment jsdom

import { afterEach, describe, it, expect } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { TableOptions, type TableOptionsConfig } from "@/engines/list-view"

function twoTabConfig(overrides?: Partial<TableOptionsConfig>): TableOptionsConfig {
  return {
    tabs: [
      { key: "sort", label: "Sort", active: false, render: () => <div>SORT BODY</div> },
      { key: "date", label: "Date", active: true, render: () => <div>DATE BODY</div> },
    ],
    ...overrides,
  }
}

describe("TableOptions", () => {
  afterEach(() => cleanup())

  it("lights the trigger's aggregate active dot when any tab is active", () => {
    render(<TableOptions config={twoTabConfig()} />)
    const trigger = screen.getByRole("button", { name: "Table options" })
    // Aggregate dot is a child marker span when any tab reports active.
    expect(trigger.querySelector("span[aria-hidden]")).toBeTruthy()
    expect(trigger.className).toContain("text-sky-500")
  })

  it("leaves the trigger idle when no tab is active", () => {
    render(
      <TableOptions
        config={{
          tabs: [
            { key: "sort", label: "Sort", active: false, render: () => <div>SORT BODY</div> },
            { key: "date", label: "Date", active: false, render: () => <div>DATE BODY</div> },
          ],
        }}
      />,
    )
    const trigger = screen.getByRole("button", { name: "Table options" })
    expect(trigger.querySelector("span[aria-hidden]")).toBeNull()
    expect(trigger.className).toContain("opacity-60")
  })

  it("renders a tab strip and switches bodies when more than one tab", async () => {
    const user = userEvent.setup()
    render(<TableOptions config={twoTabConfig()} />)

    await user.click(screen.getByRole("button", { name: "Table options" }))

    // Tab strip exposes both tabs; the first tab's body shows by default.
    expect(screen.getByRole("button", { name: "Sort" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Date" })).toBeTruthy()
    expect(screen.getByText("SORT BODY")).toBeTruthy()
    expect(screen.queryByText("DATE BODY")).toBeNull()

    await user.click(screen.getByRole("button", { name: "Date" }))
    expect(screen.getByText("DATE BODY")).toBeTruthy()
    expect(screen.queryByText("SORT BODY")).toBeNull()
  })

  it("hides the tab strip and shows the lone tab body for a single tab", async () => {
    const user = userEvent.setup()
    render(
      <TableOptions
        config={{
          tabs: [{ key: "sort", label: "Sort", active: false, render: () => <div>SORT BODY</div> }],
        }}
      />,
    )

    await user.click(screen.getByRole("button", { name: "Table options" }))
    // No second tab → no strip button for it; the single body renders directly.
    expect(screen.queryByRole("button", { name: "Date" })).toBeNull()
    expect(screen.getByText("SORT BODY")).toBeTruthy()
  })
})
