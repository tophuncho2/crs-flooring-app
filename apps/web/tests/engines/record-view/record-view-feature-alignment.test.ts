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
      "apps/web/app/dashboard/categories/[id]/page.tsx",
      "apps/web/app/dashboard/imports/[id]/page.tsx",
      "apps/web/app/dashboard/inventory/[id]/page.tsx",
      "apps/web/app/dashboard/management-companies/[id]/page.tsx",
      "apps/web/app/dashboard/manufacturers/[id]/page.tsx",
      "apps/web/app/dashboard/products/[id]/page.tsx",
      "apps/web/app/dashboard/properties/[id]/page.tsx",
      "apps/web/app/dashboard/templates/[id]/page.tsx",
      "apps/web/app/dashboard/warehouse/[id]/page.tsx",
      "apps/web/app/dashboard/work-orders/[id]/page.tsx",
      "apps/web/app/dashboard/categories/new/page.tsx",
      "apps/web/app/dashboard/imports/new/page.tsx",
      "apps/web/app/dashboard/management-companies/new/page.tsx",
      "apps/web/app/dashboard/manufacturers/new/page.tsx",
      "apps/web/app/dashboard/products/new/page.tsx",
      "apps/web/app/dashboard/properties/new/page.tsx",
      "apps/web/app/dashboard/templates/new/page.tsx",
      "apps/web/app/dashboard/warehouse/new/page.tsx",
      "apps/web/app/dashboard/work-orders/new/page.tsx",
    ]

    // Modules that have completed layer extraction use components/record/ instead of record/
    const extractedModuleRoutes = new Set([
      "apps/web/app/dashboard/manufacturers/[id]/page.tsx",
      "apps/web/app/dashboard/manufacturers/new/page.tsx",
    ])

    for (const file of routeFiles) {
      const source = await readWorkspaceFile(file)
      if (extractedModuleRoutes.has(file)) {
        expect(source).toContain("/components/record/")
      } else {
        expect(source).toContain("/record/")
        expect(source).not.toContain("/components/detail/")
        expect(source).not.toContain("/components/record/")
      }
    }
  })

  it("uses the engine-owned multi-section panel runtime for active multi-section record panels", async () => {
    const panelFiles = [
      "apps/web/modules/work-orders/record/panel/work-order-record-panel.tsx",
      "apps/web/modules/templates/record/panel/template-record-panel.tsx",
      "apps/web/modules/products/record/panel/product-record-panel.tsx",
      "apps/web/modules/imports/record/panel/import-record-panel.tsx",
      "apps/web/modules/management-companies/record/panel/management-company-record-panel.tsx",
      "apps/web/modules/properties/record/panel/property-record-panel.tsx",
      "apps/web/modules/inventory/record/panel/inventory-record-panel.tsx",
      "apps/web/modules/warehouse/record/panel/warehouse-record-panel.tsx",
    ]

    for (const file of panelFiles) {
      const source = await readWorkspaceFile(file)
      expect(source).toContain("RecordMultiSectionPanel")
      expect(source).not.toContain("RecordSectionStack")
      expect(source).not.toContain("RecordPanelFooter")
      expect(source).not.toContain("RecordPageActionNotices")
    }
  })

  it("keeps the scoped field-section path on RecordFieldSection instead of RecordPrimarySectionInstance", async () => {
    const engineFiles = [
      "apps/web/modules/shared/engines/record-view/sections/panels/record-single-section-panel.tsx",
      "apps/web/modules/work-orders/record/panel/work-order-record-panel.tsx",
      "apps/web/modules/templates/record/panel/template-record-panel.tsx",
    ]

    for (const file of engineFiles) {
      const source = await readWorkspaceFile(file)
      expect(source).toContain("RecordFieldSection")
      expect(source).not.toContain("RecordPrimarySectionInstance")
    }

    const primarySectionFiles = [
      "apps/web/modules/work-orders/record/panel/sections/work-order-primary-fields-section.tsx",
      "apps/web/modules/templates/record/panel/sections/template-primary-fields-section.tsx",
    ]

    for (const file of primarySectionFiles) {
      const source = await readWorkspaceFile(file)
      expect(source).not.toContain("RecordPrimarySectionInstance")
      expect(source).not.toContain("showHeader")
      expect(source).not.toContain("noticeMessage")
      expect(source).not.toContain("onSave")
    }
  })

  it("keeps scoped single-section record and create panels on the engine-owned single-section runtime", async () => {
    const panelFiles = [
      "apps/web/modules/categories/record/panel/category-record-panel.tsx",
      "apps/web/modules/manufacturers/components/record/manufacturer-record-panel.tsx",
      "apps/web/modules/categories/record/create/category-create-client.tsx",
      "apps/web/modules/manufacturers/components/record/manufacturer-create-client.tsx",
    ]

    for (const file of panelFiles) {
      const source = await readWorkspaceFile(file)
      expect(source).toContain("RecordSingleSectionPanel")
      expect(source).not.toContain("RecordPrimarySectionInstance")
      expect(source).not.toContain("RecordPanelFooter")
    }
  })

  it("keeps active row-heavy record sections off the old row surfaces", async () => {
    const sectionFiles = [
      "apps/web/modules/work-orders/record/panel/sections/work-order-material-items-section.tsx",
      "apps/web/modules/work-orders/record/panel/sections/work-order-service-items-section.tsx",
      "apps/web/modules/work-orders/record/panel/sections/work-order-sales-reps-section.tsx",
      "apps/web/modules/templates/record/panel/sections/template-material-items-section.tsx",
      "apps/web/modules/templates/record/panel/sections/template-service-items-section.tsx",
      "apps/web/modules/templates/record/panel/sections/template-sales-reps-section.tsx",
      "apps/web/modules/products/record/panel/sections/product-inventory-rows-section.tsx",
      "apps/web/modules/imports/record/panel/sections/import-inventory-rows-section.tsx",
      "apps/web/modules/inventory/record/panel/sections/inventory-cut-logs-section.tsx",
      "apps/web/modules/warehouse/record/panel/sections/warehouse-sections-section.tsx",
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
