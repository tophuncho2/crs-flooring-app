import { describe, expect, it } from "vitest"
import {
  createImportEntryUseCase,
  updateImportEntryUseCase,
} from "@/features/flooring/imports/application/import-entry"

describe("import entry use cases", () => {
  it("rejects creating imports with no inventory rows", async () => {
    await expect(createImportEntryUseCase({
      transportType: "PURCHASE_ORDER",
      status: "PENDING",
      items: [],
    })).rejects.toMatchObject({
      message: "Add at least one inventory row before saving the import",
      status: 400,
      field: "items",
    })
  })

  it("rejects updating imports with no inventory rows", async () => {
    await expect(updateImportEntryUseCase("imp-1", {
      transportType: "PURCHASE_ORDER",
      status: "FINAL",
      items: [],
    })).rejects.toMatchObject({
      message: "Add at least one inventory row before saving the import",
      status: 400,
      field: "items",
    })
  })
})
