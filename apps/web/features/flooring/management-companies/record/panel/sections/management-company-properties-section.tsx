"use client"

import {
  RecordItemCell,
  RecordItemSection,
  RecordItemSectionControls,
  RecordRowLayout,
  RecordSectionGrid,
  RecordSectionGridRow,
  TextCell,
  type RecordSectionSubHeaderProps,
  type RecordRowColumnSpec,
} from "@/features/shared/engines/record-view"
import type { ManagementCompanyPropertyRow, ManagementCompanyTemplateRow } from "../../../domain/types"

const PROPERTY_COLUMNS: RecordRowColumnSpec[] = [
  { key: "property", minWidth: 240, grow: 2, label: "Property" },
  { key: "address", minWidth: 280, grow: 2, label: "Address" },
  { key: "templates", minWidth: 120, grow: 1, align: "center", label: "Templates" },
  { key: "toggle", minWidth: 120, grow: 0, align: "center", label: "Show / Hide" },
  { key: "open", minWidth: 108, grow: 0, align: "center", label: "Open" },
]

const TEMPLATE_COLUMNS: RecordRowColumnSpec[] = [
  { key: "template", minWidth: 220, grow: 2, label: "Template" },
  { key: "warehouse", minWidth: 220, grow: 2, label: "Warehouse" },
  { key: "items", minWidth: 120, grow: 1, align: "center", label: "Rows" },
  { key: "open", minWidth: 108, grow: 0, align: "center", label: "Open" },
]

function buildPropertiesMetrics(properties: ManagementCompanyPropertyRow[]) {
  const templateCount = properties.reduce((total, property) => total + property.templateCount, 0)

  return [
    { label: "Properties", value: String(properties.length) },
    { label: "Templates", value: String(templateCount) },
  ]
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
      bodyClassName="space-y-0"
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
      emptyState="No properties linked to this management company yet."
    >
      <RecordSectionGrid
        columns={PROPERTY_COLUMNS}
        isEmpty={properties.length === 0}
        emptyState="No properties linked to this management company yet."
      >
        {properties.map((property, index) => {
          const isExpanded = expandedPropertyIds.includes(property.id)

          return (
            <RecordSectionGridRow
              key={property.id}
              columns={PROPERTY_COLUMNS}
              nestedContent={
                isExpanded ? (
                  <RecordSectionGrid
                    columns={TEMPLATE_COLUMNS}
                    surface="nested"
                    isEmpty={property.templates.length === 0}
                    emptyState="No templates linked to this property."
                  >
                    {property.templates.map((template, templateIndex) => (
                      <RecordSectionGridRow
                        key={template.id}
                        columns={TEMPLATE_COLUMNS}
                        rowTone="allocation"
                        onOpen={() => onOpenTemplate(template.id)}
                        openAriaLabel={`Open template ${template.templateTag}`}
                      >
                        <RecordItemCell columnKey="template" chrome="grid" tone="allocation" density="compact" showLabel={templateIndex === 0}>
                          <TextCell className="font-medium">{template.templateTag}</TextCell>
                        </RecordItemCell>
                        <RecordItemCell columnKey="warehouse" chrome="grid" tone="allocation" density="compact" showLabel={templateIndex === 0}>
                          <TextCell>{template.warehouseName || "No warehouse"}</TextCell>
                        </RecordItemCell>
                        <RecordItemCell columnKey="items" chrome="grid" tone="allocation" density="compact" showLabel={templateIndex === 0}>
                          <TextCell align="center">{template.itemsCount}</TextCell>
                        </RecordItemCell>
                        <RecordItemSectionControls
                          capabilities={{ supportsOpenRow: true }}
                          cellChrome="grid"
                          showCellLabels={templateIndex === 0}
                          open={{
                            onOpen: () => onOpenTemplate(template.id),
                            loading: loadingTemplateId === template.id,
                          }}
                        />
                      </RecordSectionGridRow>
                    ))}
                  </RecordSectionGrid>
                ) : null
              }
            >
              <RecordRowLayout columns={PROPERTY_COLUMNS}>
                <RecordItemCell columnKey="property" chrome="grid" showLabel={index === 0}>
                  <TextCell className="font-medium">{property.name}</TextCell>
                </RecordItemCell>
                <RecordItemCell columnKey="address" chrome="grid" showLabel={index === 0}>
                  <TextCell noWrap={false}>{property.fullAddress || "No address"}</TextCell>
                </RecordItemCell>
                <RecordItemCell columnKey="templates" chrome="grid" showLabel={index === 0}>
                  <TextCell align="center">{property.templateCount}</TextCell>
                </RecordItemCell>
                <RecordItemSectionControls
                  capabilities={{ supportsNestedAllocations: true, supportsOpenRow: true }}
                  cellChrome="grid"
                  showCellLabels={index === 0}
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
            </RecordSectionGridRow>
          )
        })}
      </RecordSectionGrid>
    </RecordItemSection>
  )
}
