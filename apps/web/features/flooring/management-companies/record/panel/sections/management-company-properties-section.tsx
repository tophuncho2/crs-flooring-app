"use client"

import type { ReactNode } from "react"
import {
  RecordAllocationItemRow,
  RecordAllocationItemsPanel,
  RecordItemSection,
  RecordItemSectionControls,
  RecordItemCell,
  RecordRowLayout,
  RecordRowOpenButton,
  RecordSectionItem,
  TextCell,
  type RecordSectionSubHeaderProps,
  type RecordRowColumnSpec,
} from "@/features/shared/engines/record-view"
import type { ManagementCompanyPropertyRow, ManagementCompanyTemplateRow } from "../../../domain/types"

const PROPERTY_COLUMNS: RecordRowColumnSpec[] = [
  { key: "property", minWidth: 240, grow: 2 },
  { key: "address", minWidth: 280, grow: 2 },
  { key: "templates", minWidth: 120, grow: 1, align: "center" },
  { key: "toggle", minWidth: 120, grow: 0, align: "center" },
  { key: "open", minWidth: 108, grow: 0, align: "center" },
]

const TEMPLATE_COLUMNS: RecordRowColumnSpec[] = [
  { key: "template", minWidth: 220, grow: 2 },
  { key: "warehouse", minWidth: 220, grow: 2 },
  { key: "items", minWidth: 120, grow: 1, align: "center" },
  { key: "open", minWidth: 108, grow: 0, align: "center" },
]

function buildPropertiesMetrics(properties: ManagementCompanyPropertyRow[]) {
  const templateCount = properties.reduce((total, property) => total + property.templateCount, 0)

  return [
    { label: "Properties", value: String(properties.length) },
    { label: "Templates", value: String(templateCount) },
  ]
}

function PropertyTemplateRow({
  template,
  loading,
  onOpen,
}: {
  template: ManagementCompanyTemplateRow
  loading: boolean
  onOpen: () => void
}) {
  return (
    <RecordAllocationItemRow
      onOpen={onOpen}
      openAriaLabel={`Open template ${template.templateTag}`}
    >
      <RecordRowLayout columns={TEMPLATE_COLUMNS}>
        <RecordItemCell label="Template" columnKey="template" tone="allocation" density="compact">
          <TextCell className="font-medium">{template.templateTag}</TextCell>
        </RecordItemCell>
        <RecordItemCell label="Warehouse" columnKey="warehouse" tone="allocation" density="compact">
          <TextCell>{template.warehouseName || "No warehouse"}</TextCell>
        </RecordItemCell>
        <RecordItemCell label="Rows" columnKey="items" tone="allocation" density="compact">
          <TextCell align="center">{template.itemsCount}</TextCell>
        </RecordItemCell>
        <RecordItemCell label="Open" columnKey="open" tone="allocation" density="compact">
          <div className="flex min-h-[2.5rem] items-center justify-center">
            <RecordRowOpenButton
              onOpen={onOpen}
              loading={loading}
            />
          </div>
        </RecordItemCell>
      </RecordRowLayout>
    </RecordAllocationItemRow>
  )
}

export function ManagementCompanyPropertiesSection({
  subHeader,
  properties,
  expandedPropertyIds,
  loadingPropertyId,
  loadingTemplateId,
  onTogglePropertyTemplates,
  onOpenProperty,
  onOpenTemplate,
}: {
  subHeader?: Omit<RecordSectionSubHeaderProps, "sectionType" | "capabilities">
  properties: ManagementCompanyPropertyRow[]
  expandedPropertyIds: string[]
  loadingPropertyId: string | null
  loadingTemplateId: string | null
  onTogglePropertyTemplates: (propertyId: string) => void
  onOpenProperty: (propertyId: string) => void
  onOpenTemplate: (templateId: string) => void
}) {
  return (
    <RecordItemSection
      title="Linked Properties"
      bodyClassName="space-y-4"
      subHeader={subHeader}
      metrics={buildPropertiesMetrics(properties)}
      capabilities={{
        supportsMetrics: true,
        supportsSummary: true,
        supportsEmptyState: true,
        supportsNestedAllocations: true,
        supportsOpenRow: true,
        supportsRouteAdd: true,
      }}
      isEmpty={properties.length === 0}
      emptyState={(
        <div className="rounded-2xl border border-dashed border-[rgba(58,58,58,0.72)] px-4 py-8 text-center text-[var(--foreground)]/65">
          No properties linked to this management company yet.
        </div>
      )}
    >
      {properties.length > 0 ? (
        properties.map((property) => {
          const isExpanded = expandedPropertyIds.includes(property.id)

          return (
            <RecordSectionItem
              key={property.id}
              onOpen={() => onOpenProperty(property.id)}
              openAriaLabel={`Open property ${property.name}`}
              nestedContent={
                isExpanded ? (
                  <RecordAllocationItemsPanel
                    emptyState="No templates linked to this property."
                  >
                    {property.templates.length > 0
                      ? property.templates.map((template) => (
                          <PropertyTemplateRow
                            key={template.id}
                            template={template}
                            loading={loadingTemplateId === template.id}
                            onOpen={() => onOpenTemplate(template.id)}
                          />
                        ))
                      : null}
                  </RecordAllocationItemsPanel>
                ) : null
              }
            >
              <RecordRowLayout columns={PROPERTY_COLUMNS}>
                <RecordItemCell label="Property" columnKey="property">
                  <TextCell className="font-medium">{property.name}</TextCell>
                </RecordItemCell>
                <RecordItemCell label="Address" columnKey="address">
                  <TextCell noWrap={false}>{property.fullAddress || "No address"}</TextCell>
                </RecordItemCell>
                <RecordItemCell label="Templates" columnKey="templates">
                  <TextCell align="center">{property.templateCount}</TextCell>
                </RecordItemCell>
                <RecordItemSectionControls
                  capabilities={{ supportsNestedAllocations: true, supportsOpenRow: true }}
                  toggle={{
                    expanded: isExpanded,
                    onToggle: () => onTogglePropertyTemplates(property.id),
                    ariaLabel: isExpanded ? `Hide templates for ${property.name}` : `Show templates for ${property.name}`,
                  }}
                  open={{
                    onOpen: () => onOpenProperty(property.id),
                    loading: loadingPropertyId === property.id,
                  }}
                />
              </RecordRowLayout>
            </RecordSectionItem>
          )
        })
      ) : null}
    </RecordItemSection>
  )
}
