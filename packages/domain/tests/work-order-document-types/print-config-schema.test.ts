import { describe, expect, it } from "vitest"
import {
  parseWorkOrderPrintConfig,
  workOrderPrintConfigSchema,
} from "../../src/work-order-document-types/types.js"

describe("workOrderPrintConfigSchema / parseWorkOrderPrintConfig", () => {
  it("accepts a valid partial config", () => {
    const value = {
      sections: { adjustments: false },
      adjustmentColumns: { converted: false },
    }
    expect(workOrderPrintConfigSchema.safeParse(value).success).toBe(true)
    expect(parseWorkOrderPrintConfig(value)).toEqual(value)
  })

  it("accepts an empty object", () => {
    expect(parseWorkOrderPrintConfig({})).toEqual({})
  })

  it("strips unknown top-level keys", () => {
    const parsed = parseWorkOrderPrintConfig({
      bogus: true,
      sections: { adjustments: false },
    })
    expect(parsed).toEqual({ sections: { adjustments: false } })
  })

  it("returns {} for an invalid (non-boolean) value", () => {
    expect(parseWorkOrderPrintConfig({ sections: { adjustments: "yes" } })).toEqual({})
  })

  it("returns {} for null / undefined", () => {
    expect(parseWorkOrderPrintConfig(null)).toEqual({})
    expect(parseWorkOrderPrintConfig(undefined)).toEqual({})
  })
})
