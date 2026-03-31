import { readFile } from "node:fs/promises"
import path from "node:path"
import { describe, expect, it } from "vitest"

const ROOT = "/Users/j.otto/Code Projects/CRS/builderswebapp"

async function readWorkspaceFile(relativePath: string) {
  return readFile(path.join(ROOT, relativePath), "utf8")
}

describe("record view feature alignment", () => {
  it("active detail and create routes point at engine-owned record clients", async () => {
    const routeFiles = [
      "apps/web/app/dashboard/flooring/categories/[id]/page.tsx",
      "apps/web/app/dashboard/flooring/contacts/[id]/page.tsx",
      "apps/web/app/dashboard/flooring/imports/[id]/page.tsx",
      "apps/web/app/dashboard/flooring/inventory/[id]/page.tsx",
      "apps/web/app/dashboard/flooring/management-companies/[id]/page.tsx",
      "apps/web/app/dashboard/flooring/manufacturers/[id]/page.tsx",
      "apps/web/app/dashboard/flooring/products/[id]/page.tsx",
      "apps/web/app/dashboard/flooring/properties/[id]/page.tsx",
      "apps/web/app/dashboard/flooring/services/[id]/page.tsx",
      "apps/web/app/dashboard/flooring/templates/[id]/page.tsx",
      "apps/web/app/dashboard/flooring/unit-of-measures/[id]/page.tsx",
      "apps/web/app/dashboard/flooring/warehouse/[id]/page.tsx",
      "apps/web/app/dashboard/flooring/work-orders/[id]/page.tsx",
      "apps/web/app/dashboard/flooring/categories/new/page.tsx",
      "apps/web/app/dashboard/flooring/contacts/new/page.tsx",
      "apps/web/app/dashboard/flooring/imports/new/page.tsx",
      "apps/web/app/dashboard/flooring/management-companies/new/page.tsx",
      "apps/web/app/dashboard/flooring/manufacturers/new/page.tsx",
      "apps/web/app/dashboard/flooring/products/new/page.tsx",
      "apps/web/app/dashboard/flooring/properties/new/page.tsx",
      "apps/web/app/dashboard/flooring/services/new/page.tsx",
      "apps/web/app/dashboard/flooring/templates/new/page.tsx",
      "apps/web/app/dashboard/flooring/unit-of-measures/new/page.tsx",
      "apps/web/app/dashboard/flooring/warehouse/new/page.tsx",
      "apps/web/app/dashboard/flooring/work-orders/new/page.tsx",
    ]

    for (const file of routeFiles) {
      const source = await readWorkspaceFile(file)
      expect(source).toContain("/record/")
      expect(source).not.toContain("/components/detail/")
      expect(source).not.toContain("/components/record/")
    }
  })

  it("uses the engine-owned multi-section panel runtime for active multi-section record panels", async () => {
    const panelFiles = [
      "apps/web/features/flooring/work-orders/record/panel/work-order-record-panel.tsx",
      "apps/web/features/flooring/templates/record/panel/template-record-panel.tsx",
      "apps/web/features/flooring/products/record/panel/product-record-panel.tsx",
      "apps/web/features/flooring/imports/record/panel/import-record-panel.tsx",
      "apps/web/features/flooring/management-companies/record/panel/management-company-record-panel.tsx",
      "apps/web/features/flooring/properties/record/panel/property-record-panel.tsx",
      "apps/web/features/flooring/inventory/record/panel/inventory-record-panel.tsx",
      "apps/web/features/flooring/warehouse/record/panel/warehouse-record-panel.tsx",
    ]

    for (const file of panelFiles) {
      const source = await readWorkspaceFile(file)
      expect(source).toContain("RecordMultiSectionPanel")
      expect(source).not.toContain("RecordSectionStack")
      expect(source).not.toContain("RecordPanelFooter")
      expect(source).not.toContain("RecordPageActionNotices")
    }
  })

  it("keeps active row-heavy record sections off the old row surfaces", async () => {
    const sectionFiles = [
      "apps/web/features/flooring/work-orders/record/panel/sections/work-order-material-items-section.tsx",
      "apps/web/features/flooring/work-orders/record/panel/sections/work-order-service-items-section.tsx",
      "apps/web/features/flooring/work-orders/record/panel/sections/work-order-sales-reps-section.tsx",
      "apps/web/features/flooring/work-orders/record/panel/sections/material-allocations-editor.tsx",
      "apps/web/features/flooring/templates/record/panel/sections/template-material-items-section.tsx",
      "apps/web/features/flooring/templates/record/panel/sections/template-service-items-section.tsx",
      "apps/web/features/flooring/templates/record/panel/sections/template-sales-reps-section.tsx",
      "apps/web/features/flooring/products/record/panel/sections/product-inventory-rows-section.tsx",
      "apps/web/features/flooring/imports/record/panel/sections/import-inventory-rows-section.tsx",
      "apps/web/features/flooring/management-companies/record/panel/sections/management-company-properties-section.tsx",
      "apps/web/features/flooring/properties/record/panel/sections/property-templates-section.tsx",
      "apps/web/features/flooring/inventory/record/panel/sections/inventory-cut-logs-section.tsx",
      "apps/web/features/flooring/warehouse/record/panel/sections/warehouse-sections-section.tsx",
    ]

    for (const file of sectionFiles) {
      const source = await readWorkspaceFile(file)
      expect(source).toContain("RecordSectionGrid")
      expect(source).not.toContain("RecordSectionItem")
      expect(source).not.toContain("RecordAllocationItemsPanel")
      expect(source).not.toContain("RecordAllocationItemRow")
    }
  })
})
