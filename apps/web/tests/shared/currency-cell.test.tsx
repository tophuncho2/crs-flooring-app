// @vitest-environment jsdom

import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { CurrencyCell } from "@/modules/shared/engines/record-view"

describe("CurrencyCell", () => {
  it("strips a preformatted leading dollar sign from readonly values", () => {
    const { container } = render(<CurrencyCell value="$25.00" />)

    expect(container.textContent).toContain("$25.00")
    expect(container.textContent).not.toContain("$$25.00")
  })

  it("renders the unit tag only when a unit is provided", () => {
    const { rerender, container } = render(<CurrencyCell value="$25.00" unit="SY" />)

    expect(container.textContent).toContain("/ SY")

    rerender(<CurrencyCell value="$25.00" />)

    expect(screen.queryByText(/\/\s*SY/)).toBeNull()
    expect(container.textContent).not.toContain("/ unit")
  })
})
