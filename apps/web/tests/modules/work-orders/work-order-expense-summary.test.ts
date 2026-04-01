import { describe, expect, it } from "vitest"
import { calculateWorkOrderExpenseSummary, calculateWorkOrderSalesRepExpense } from "@/modules/work-orders/domain/expense-summary"

describe("work order expense summary", () => {
  it("calculates customer cost, sales rep expense, and total expenses", () => {
    const summary = calculateWorkOrderExpenseSummary({
      items: [
        { quantity: "10", unitPrice: "2.50" },
        { quantity: "3", unitPrice: "4.00" },
      ],
      serviceItems: [
        { quantity: "2", unitPrice: "15.00" },
      ],
      salesReps: [
        { percent: "10" },
        { percent: "5.5" },
      ],
    })

    expect(summary).toEqual({
      materialTotal: 37,
      serviceTotal: 30,
      customerCost: 67,
      salesRepExpense: 10.385,
      expenses: 77.385,
      profit: -10.385000000000005,
      profitMargin: -0.15500000000000008,
    })
  })

  it("treats invalid sales-rep percents as zero in derived amount math", () => {
    expect(calculateWorkOrderSalesRepExpense(100, [{ percent: "abc" }, { percent: "5" }])).toBe(5)
  })
})
