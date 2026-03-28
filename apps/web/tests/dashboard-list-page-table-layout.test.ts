import { describe, expect, it } from "vitest"
import { buildDashboardListTableMinWidth } from "@/features/dashboard/shared/list-page/dashboard-list-page-table-layout"

describe("buildDashboardListTableMinWidth", () => {
  it("keeps narrow tables at full width minimum", () => {
    expect(buildDashboardListTableMinWidth(3)).toBe("max(100%, 76rem)")
  })

  it("expands with visible column count for wider dashboard tables", () => {
    expect(buildDashboardListTableMinWidth(14, { columnWidthRem: 10 })).toBe("max(100%, 140rem)")
  })
})
