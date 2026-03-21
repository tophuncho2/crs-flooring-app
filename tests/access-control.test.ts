import { describe, expect, it } from "vitest"
import {
  canAccessBuilderPanel,
  canEditCategories,
  canEditUnitOfMeasures,
  hasGovernanceAccess,
  hasSystemAccess,
} from "@/server/auth/access-control"

describe("access-control", () => {
  it("treats owner as the top governance role", () => {
    expect(hasGovernanceAccess("OWNER")).toBe(true)
    expect(hasSystemAccess("OWNER")).toBe(true)
    expect(canAccessBuilderPanel("owner@test.com", "OWNER")).toBe(true)
    expect(canEditCategories("OWNER")).toBe(true)
    expect(canEditUnitOfMeasures("OWNER")).toBe(true)
  })

  it("keeps admins as governance users and builders as non-governance system users", () => {
    expect(hasGovernanceAccess("ADMIN")).toBe(true)
    expect(canAccessBuilderPanel("admin@test.com", "ADMIN")).toBe(true)
    expect(canEditCategories("ADMIN")).toBe(true)
    expect(canEditUnitOfMeasures("ADMIN")).toBe(true)

    expect(hasGovernanceAccess("BUILDER")).toBe(false)
    expect(hasSystemAccess("BUILDER")).toBe(true)
    expect(canAccessBuilderPanel("builder@test.com", "BUILDER")).toBe(false)
    expect(canEditCategories("BUILDER")).toBe(false)
    expect(canEditUnitOfMeasures("BUILDER")).toBe(false)
  })
})
