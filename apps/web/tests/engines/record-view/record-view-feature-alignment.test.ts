import path from "node:path"
import { describe, expect, it } from "vitest"

const ROOT = "/Users/j.otto/Code Projects/CRS/builderswebapp"

describe("record view feature alignment", () => {
  it("manufacturers and management-companies have no @/modules/shared/engines imports", async () => {
    const migratedDirs = [
      "apps/web/modules/manufacturers",
      "apps/web/modules/management-companies",
      "apps/web/app/dashboard/manufacturers",
      "apps/web/app/dashboard/management-companies",
      "apps/web/app/api/manufacturers",
      "apps/web/app/api/management-companies",
    ]

    const { execSync } = await import("node:child_process")
    for (const dir of migratedDirs) {
      const result = execSync(
        `grep -rln '@/modules/shared/engines' "${path.join(ROOT, dir)}" || true`,
        { encoding: "utf8" },
      ).trim()
      expect(result, `unexpected engine imports under ${dir}`).toBe("")
    }
  })
})
