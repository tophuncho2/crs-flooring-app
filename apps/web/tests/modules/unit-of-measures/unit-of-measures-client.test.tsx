// @vitest-environment jsdom

import React from "react"
import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import {
  resetSimpleTableClientMocks,
} from "../../helpers/simple-table-client-mocks"
import UnitOfMeasuresClient from "@/modules/unit-of-measures/components/list/unit-of-measures-client"

describe("UnitOfMeasuresClient", () => {
  it("renders a read-only list of unit of measures", () => {
    resetSimpleTableClientMocks()

    render(
      <UnitOfMeasuresClient
        initialUnitOfMeasures={[
          { id: "u-1", name: "Square Feet", createdAt: "2026-03-19T00:00:00.000Z", updatedAt: "2026-03-19T00:00:00.000Z" },
          { id: "u-2", name: "Linear Feet", createdAt: "2026-03-19T00:00:00.000Z", updatedAt: "2026-03-19T00:00:00.000Z" },
        ]}
        tableState={{ searchQuery: "", isAscendingSort: true, isGroupingEnabled: false, groupByKeys: [] }}
      />,
    )

    expect(screen.getByText("Square Feet")).toBeTruthy()
    expect(screen.getByText("Linear Feet")).toBeTruthy()
    expect(screen.queryByRole("button", { name: /unit of measure/i })).toBeNull()
    expect(screen.queryByRole("button", { name: /delete/i })).toBeNull()
  })
})
