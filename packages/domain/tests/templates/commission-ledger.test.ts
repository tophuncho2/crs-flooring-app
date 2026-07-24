import { describe, expect, it } from "vitest"
import {
  computeTemplateCommissionLineTotal,
  sumTemplateCommissionLineTotals,
} from "../../src/templates/commissions/math.js"
import {
  computeTemplateCostLedger,
  type TemplateLedgerInputs,
} from "../../src/templates/ledger.js"

describe("computeTemplateCommissionLineTotal", () => {
  it("is percent × netCost, half-up", () => {
    expect(computeTemplateCommissionLineTotal("10", "600.00")).toBe("60.00")
    // 7.5% of 600 = 45.00
    expect(computeTemplateCommissionLineTotal("7.5", "600.00")).toBe("45.00")
  })
  it("blank percent → '' (the grid renders —)", () => {
    expect(computeTemplateCommissionLineTotal("", "600.00")).toBe("")
  })
  it("zero netCost → 0.00 when a percent is present", () => {
    expect(computeTemplateCommissionLineTotal("10", "0.00")).toBe("0.00")
  })
})

describe("sumTemplateCommissionLineTotals", () => {
  it("sums each row's percent × the shared netCost", () => {
    // (10% + 5%) of 600 = 60 + 30 = 90.00
    expect(sumTemplateCommissionLineTotals(["10", "5"], "600.00")).toBe("90.00")
  })
  it("blank rows contribute nothing; all-blank → 0.00", () => {
    expect(sumTemplateCommissionLineTotals(["", ""], "600.00")).toBe("0.00")
  })
})

describe("computeTemplateCostLedger", () => {
  // Worked example: Material 400 + Labor 150 + Misc 50 = Net Cost 600. Only the
  // planned product is taxed (400 base). Tax 8%. One rep at 10%. Revenue 1000.
  const base: TemplateLedgerInputs = {
    totalTransaction: "1000.00",
    taxRate: "8",
    plannedProducts: [{ quantity: "10", cost: "40.00", taxed: true }],
    serviceItems: [
      { itemType: "LABOR", quantity: "1", cost: "150.00", taxed: false },
      { itemType: "MISCELLANEOUS", quantity: "1", cost: "50.00", taxed: false },
    ],
    commissions: [{ percent: "10" }],
  }

  it("computes the full ledger", () => {
    const l = computeTemplateCostLedger(base)
    expect(l.materialCost).toBe("400.00")
    expect(l.laborCost).toBe("150.00")
    expect(l.miscCost).toBe("50.00")
    expect(l.netCost).toBe("600.00")
    expect(l.netMargin).toBe("40.00")
    expect(l.netProfit).toBe("400.00")
    expect(l.commissionCost).toBe("60.00")
    expect(l.taxCost).toBe("32.00")
    expect(l.projectedCost).toBe("692.00")
    expect(l.projectedProfit).toBe("308.00")
    expect(l.projectedMargin).toBe("30.80")
  })

  it("keeps commission OUT of Net Cost / Margin / Profit (only Projected changes)", () => {
    const withRep = computeTemplateCostLedger(base)
    const noRep = computeTemplateCostLedger({ ...base, commissions: [] })
    expect(withRep.netCost).toBe(noRep.netCost)
    expect(withRep.netProfit).toBe(noRep.netProfit)
    expect(withRep.netMargin).toBe(noRep.netMargin)
    // Projected drops by exactly the commission.
    expect(noRep.projectedCost).toBe("632.00")
    expect(withRep.projectedCost).toBe("692.00")
  })

  it("blank or zero Total Transaction → margins '' (rendered —), dollars still compute", () => {
    for (const totalTransaction of ["", "0.00"]) {
      const l = computeTemplateCostLedger({ ...base, totalTransaction })
      expect(l.netMargin).toBe("")
      expect(l.projectedMargin).toBe("")
      expect(l.netCost).toBe("600.00")
      expect(l.commissionCost).toBe("60.00")
    }
  })

  it("supports a negative (loss) margin", () => {
    const l = computeTemplateCostLedger({
      ...base,
      totalTransaction: "500.00",
      taxRate: "",
      commissions: [],
    })
    // Net Cost 600 > revenue 500 → loss of 100, margin −20%.
    expect(l.netProfit).toBe("-100.00")
    expect(l.netMargin).toBe("-20.00")
  })
})
