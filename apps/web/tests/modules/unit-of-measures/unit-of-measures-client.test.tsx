// @vitest-environment jsdom

import { afterEach } from "vitest"
import { describe, expect, it } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import UnitOfMeasuresClient from "@/modules/unit-of-measures/components/list/unit-of-measures-client"

afterEach(() => {
  cleanup()
})

describe("UnitOfMeasuresClient", () => {
  it("renders a read-only list of unit of measures", () => {
    render(
      <UnitOfMeasuresClient
        initialRows={[
          { id: "u-1", slug: "sf", name: "Square Feet", abbreviation: "sf", createdAt: "2026-03-19T00:00:00.000Z", updatedAt: "2026-03-19T00:00:00.000Z" },
          { id: "u-2", slug: "lf", name: "Linear Feet", abbreviation: "lf", createdAt: "2026-03-19T00:00:00.000Z", updatedAt: "2026-03-19T00:00:00.000Z" },
        ]}
      />,
    )

    expect(screen.getByText("Square Feet")).toBeTruthy()
    expect(screen.getByText("Linear Feet")).toBeTruthy()
    expect(screen.queryByRole("searchbox")).toBeNull()
    expect(screen.queryByRole("button", { name: /delete/i })).toBeNull()
  })
})
