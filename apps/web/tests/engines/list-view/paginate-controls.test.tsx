// @vitest-environment jsdom

import { afterEach, describe, it, expect, vi } from "vitest"
import { cleanup, render } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PaginateControls } from "@/engines/list-view/toolbar/paginate/paginate-controls"

const BASE = {
  page: 2,
  pageSize: 25,
  totalItems: 60,
  totalPages: 3,
  hasPreviousPage: true,
  hasNextPage: true,
}

describe("PaginateControls", () => {
  afterEach(() => cleanup())

  it("renders the page counter", () => {
    const { getByText } = render(<PaginateControls {...BASE} />)
    expect(getByText(/Page 2 of 3 · 60 items · 25\/page/)).toBeTruthy()
  })

  it("clamps the displayed total pages to at least 1", () => {
    const { getByText } = render(
      <PaginateControls {...BASE} page={1} totalPages={0} totalItems={0} pageSize={0} />,
    )
    expect(getByText(/Page 1 of 1 · 0 items/)).toBeTruthy()
  })

  it("disables prev when there is no previous page", () => {
    const { getByRole } = render(<PaginateControls {...BASE} hasPreviousPage={false} />)
    expect((getByRole("button", { name: "← Previous" }) as HTMLButtonElement).disabled).toBe(true)
  })

  it("disables next when there is no next page", () => {
    const { getByRole } = render(<PaginateControls {...BASE} hasNextPage={false} />)
    expect((getByRole("button", { name: "Next →" }) as HTMLButtonElement).disabled).toBe(true)
  })

  it("fires onPreviousPage / onNextPage in button mode", async () => {
    const user = userEvent.setup()
    const onPreviousPage = vi.fn()
    const onNextPage = vi.fn()
    const { getByRole } = render(
      <PaginateControls {...BASE} onPreviousPage={onPreviousPage} onNextPage={onNextPage} />,
    )
    await user.click(getByRole("button", { name: "← Previous" }))
    await user.click(getByRole("button", { name: "Next →" }))
    expect(onPreviousPage).toHaveBeenCalledTimes(1)
    expect(onNextPage).toHaveBeenCalledTimes(1)
  })

  it("renders anchor links when href props are supplied", () => {
    const { getByRole } = render(
      <PaginateControls
        {...BASE}
        previousPageHref="/list?page=1"
        nextPageHref="/list?page=3"
      />,
    )
    expect(getByRole("link", { name: "← Previous" }).getAttribute("href")).toBe("/list?page=1")
    expect(getByRole("link", { name: "Next →" }).getAttribute("href")).toBe("/list?page=3")
  })

  it("drops the href on a disabled link edge", () => {
    const { getByText } = render(
      <PaginateControls
        {...BASE}
        hasNextPage={false}
        previousPageHref="/list?page=1"
        nextPageHref="/list?page=3"
      />,
    )
    // No href → the anchor loses its implicit `link` role and is marked disabled.
    const next = getByText("Next →")
    expect(next.getAttribute("href")).toBeNull()
    expect(next.getAttribute("aria-disabled")).toBe("true")
  })
})
