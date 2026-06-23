import { describe, expect, it } from "vitest"
import { parseAdjustmentsListInputFromSearchParams } from "@/modules/adjustments/data/list-adjustments-request"

describe("parseAdjustmentsListInputFromSearchParams — identity search bars", () => {
  it("parses adjNumber alongside the inv#/roll#/dye/note bars", () => {
    const input = parseAdjustmentsListInputFromSearchParams({
      adjNumber: "12",
      invNumber: "200",
      rollNumber: "R-7",
      dyeLot: "D9",
      note: "ripped",
    })

    expect(input.filters?.adjNumber).toBe("12")
    expect(input.filters?.invNumber).toBe("200")
    expect(input.filters?.rollNumber).toBe("R-7")
    expect(input.filters?.dyeLot).toBe("D9")
    expect(input.filters?.note).toBe("ripped")
  })

  it("omits adjNumber when blank/whitespace", () => {
    const input = parseAdjustmentsListInputFromSearchParams({ adjNumber: "   " })
    expect(input.filters).toBeUndefined()
  })

  it("trims adjNumber and tolerates an array-valued param", () => {
    const input = parseAdjustmentsListInputFromSearchParams({ adjNumber: ["  5 ", "9"] })
    expect(input.filters?.adjNumber).toBe("5")
  })
})
