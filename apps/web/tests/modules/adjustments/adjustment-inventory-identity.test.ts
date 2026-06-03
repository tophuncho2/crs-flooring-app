import { describe, expect, it } from "vitest"
import {
  buildCreateLocal,
  buildEditLocal,
} from "@/modules/adjustments/controllers/adjustment-side-panel/form"
import type {
  AdjustmentCreateSeed,
  AdjustmentPanelRow,
} from "@/modules/adjustments/controllers/adjustment-side-panel/types"

describe("adjustment panel — four-column inventory identity", () => {
  it("buildCreateLocal maps the four seed columns into the picked identity locals", () => {
    const seed: AdjustmentCreateSeed = {
      inventoryId: "inv-1",
      inventoryItem: "100 · R-7 · D9",
      inventoryNumber: "100",
      inventoryRollNumber: "R-7",
      inventoryDyeLot: "D9",
      inventoryNote: "ripped corner",
      stockUnitAbbrev: "sqft",
    }

    const local = buildCreateLocal(seed)

    expect(local.pickedInventoryItem).toBe("100 · R-7 · D9")
    expect(local.pickedInventoryNumber).toBe("100")
    expect(local.pickedInventoryRollNumber).toBe("R-7")
    expect(local.pickedInventoryDyeLot).toBe("D9")
    expect(local.pickedInventoryNote).toBe("ripped corner")
    expect(local.pickedInventoryStockUnitAbbrev).toBe("sqft")
  })

  it("buildCreateLocal defaults missing seed columns to empty strings", () => {
    const local = buildCreateLocal({ inventoryId: "inv-1" })
    expect(local.pickedInventoryNumber).toBe("")
    expect(local.pickedInventoryRollNumber).toBe("")
    expect(local.pickedInventoryDyeLot).toBe("")
    expect(local.pickedInventoryNote).toBe("")
  })

  it("buildEditLocal reads the adjustment row columns, mapping inventoryNote -> pickedInventoryNote", () => {
    const adjustment = {
      inventoryItem: "200 · R-3 · D1",
      inventoryNumber: "200",
      rollNumber: "R-3",
      dyeLot: "D1",
      inventoryNote: "edge wear",
      stockUnitAbbrev: "sqyd",
      location: "A-12",
      warehouseName: "Main",
    } as unknown as AdjustmentPanelRow

    const local = buildEditLocal(adjustment)

    expect(local.pickedInventoryItem).toBe("200 · R-3 · D1")
    expect(local.pickedInventoryNumber).toBe("200")
    expect(local.pickedInventoryRollNumber).toBe("R-3")
    expect(local.pickedInventoryDyeLot).toBe("D1")
    expect(local.pickedInventoryNote).toBe("edge wear")
  })

  it("buildEditLocal tolerates null identity columns", () => {
    const adjustment = {
      inventoryItem: "",
      inventoryNumber: null,
      rollNumber: null,
      dyeLot: null,
      inventoryNote: null,
      stockUnitAbbrev: null,
      location: null,
      warehouseName: null,
    } as unknown as AdjustmentPanelRow

    const local = buildEditLocal(adjustment)
    expect(local.pickedInventoryNumber).toBe("")
    expect(local.pickedInventoryRollNumber).toBe("")
    expect(local.pickedInventoryDyeLot).toBe("")
    expect(local.pickedInventoryNote).toBe("")
  })
})
