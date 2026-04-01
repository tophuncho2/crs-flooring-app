// @vitest-environment jsdom

import React from "react"
import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { EditRowButton, OpenRowButton } from "@/modules/shared/engines/list-view/table/row-action-buttons"

describe("row action buttons", () => {
  it("renders the shared open button with an Open label by default", async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()

    render(<OpenRowButton onClick={onClick} />)

    await user.click(screen.getByRole("button", { name: "Open" }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it("keeps the edit button label distinct", () => {
    render(<EditRowButton onClick={() => {}} />)
    expect(screen.getByRole("button", { name: "Edit" })).toBeTruthy()
  })
})
