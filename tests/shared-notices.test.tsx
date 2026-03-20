// @vitest-environment jsdom

import React from "react"
import { beforeEach, describe, expect, it } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import { FormStatusNotices } from "@/features/flooring/shared/notices"

describe("FormStatusNotices", () => {
  beforeEach(() => {
    cleanup()
  })

  it("renders nothing when there are no notices to show", () => {
    const { container } = render(<FormStatusNotices />)

    expect(container.firstChild).toBeNull()
  })

  it("renders success, error, and loading notices together when provided", () => {
    render(
      <FormStatusNotices
        message="Saved"
        error="Failed"
        loadingMessage="Saving"
      />,
    )

    expect(screen.getByText("Saved")).toBeTruthy()
    expect(screen.getByText("Failed")).toBeTruthy()
    expect(screen.getByText("Saving")).toBeTruthy()
  })

  it("renders only the provided subset of notices", () => {
    render(<FormStatusNotices error="Only error" />)

    expect(screen.getByText("Only error")).toBeTruthy()
    expect(screen.queryByText("Saved")).toBeNull()
    expect(screen.queryByText("Saving")).toBeNull()
  })
})
