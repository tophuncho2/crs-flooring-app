// @vitest-environment jsdom

import { render, screen } from "@testing-library/react"
import { renderToString } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import HeaderControlsShell from "../app/dashboard/header-controls-shell"

vi.mock("../app/dashboard/header-controls", () => ({
  __esModule: true,
  default: () => <div data-testid="header-controls">Header</div>,
}))

describe("HeaderControlsShell", () => {
  it("renders header controls consistently on the server and client", () => {
    const serverMarkup = renderToString(
      <HeaderControlsShell
        email="admin@test.com"
        role="OWNER"
        canUseTools
        tools={[]}
        initialVisibleFlooringSlugs={["flooring-services"]}
        initialOrderedFlooringSlugs={["flooring-services"]}
      />,
    )

    expect(serverMarkup).toContain("data-testid=\"header-controls\"")

    render(
      <HeaderControlsShell
        email="admin@test.com"
        role="OWNER"
        canUseTools
        tools={[]}
        initialVisibleFlooringSlugs={["flooring-services"]}
        initialOrderedFlooringSlugs={["flooring-services"]}
      />,
    )

    expect(screen.getByTestId("header-controls")).toBeTruthy()
  })
})
