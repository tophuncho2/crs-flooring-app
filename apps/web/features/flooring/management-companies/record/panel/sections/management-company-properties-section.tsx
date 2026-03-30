"use client"

import type { ReactNode } from "react"
import {
  RecordAllocationItemRow,
  RecordAllocationItemsPanel,
  RecordGridCellInput,
  RecordItemCell,
  RecordRowLayout,
  RecordRowOpenButton,
  RecordRowToggleButton,
  RecordSectionItem,
  RecordSectionShell,
  RecordSectionStatusBadge,
  TextCell,
  type RecordRowColumnSpec,
} from "@/features/shared/engines/record-view"
import type { ManagementCompanyPropertyRow, ManagementCompanyTemplateRow } from "../../../domain/types"
import type { ManagementCompanyPropertyDraft } from "../controllers/use-management-company-properties-section"

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
  actionPanel,
  properties,
  draft,
  expandedPropertyIds,
  loadingPropertyId,
  loadingTemplateId,
  noticeMessage,
  noticeError,
  onTogglePropertyTemplates,
  onDraftChange,
  onOpenProperty,
  onOpenTemplate,
}: {
  actionPanel?: ReactNode
  properties: ManagementCompanyPropertyRow[]
  draft: ManagementCompanyPropertyDraft | null
  expandedPropertyIds: string[]
  loadingPropertyId: string | null
  loadingTemplateId: string | null
  noticeMessage?: string
  noticeError?: string
  onTogglePropertyTemplates: (propertyId: string) => void
  onDraftChange: (field: keyof Omit<ManagementCompanyPropertyDraft, "id">, value: string) => void
  onOpenProperty: (propertyId: string) => void
  onOpenTemplate: (templateId: string) => void
}) {
  return (
    <RecordSectionShell
      title="Linked Properties"
      bodyClassName="space-y-4"
      statusPanel={actionPanel}
      noticeMessage={noticeMessage}
      noticeError={noticeError}
      metrics={buildPropertiesMetrics(properties)}
    >
      {draft ? (
        <RecordSectionItem status={<RecordSectionStatusBadge tone="warning">Draft</RecordSectionStatusBadge>}>
          <RecordRowLayout columns={PROPERTY_COLUMNS}>
            <RecordItemCell label="Property" columnKey="property">
              <RecordGridCellInput
                aria-label="Property Name"
                value={draft.name}
                placeholder="Property Name"
                controlSize="compact"
                onChange={(event) => onDraftChange("name", event.target.value)}
              />
            </RecordItemCell>
            <RecordItemCell label="Address" columnKey="address">
              <div className="grid gap-2 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_88px_108px]">
                <RecordGridCellInput
                  aria-label="Street Address"
                  value={draft.streetAddress}
                  placeholder="Street Address"
                  controlSize="compact"
                  onChange={(event) => onDraftChange("streetAddress", event.target.value)}
                />
                <RecordGridCellInput
                  aria-label="City"
                  value={draft.city}
                  placeholder="City"
                  controlSize="compact"
                  onChange={(event) => onDraftChange("city", event.target.value)}
                />
                <RecordGridCellInput
                  aria-label="State"
                  value={draft.state}
                  placeholder="ST"
                  maxLength={2}
                  controlSize="compact"
                  onChange={(event) => onDraftChange("state", event.target.value)}
                />
                <RecordGridCellInput
                  aria-label="Zip"
                  value={draft.zip}
                  placeholder="Zip"
                  controlSize="compact"
                  onChange={(event) => onDraftChange("zip", event.target.value)}
                />
              </div>
            </RecordItemCell>
            <RecordItemCell label="Templates" columnKey="templates">
              <TextCell align="center">New</TextCell>
            </RecordItemCell>
            <RecordItemCell label="Show / Hide" columnKey="toggle">
              <TextCell align="center">Save first</TextCell>
            </RecordItemCell>
            <RecordItemCell label="Open" columnKey="open">
              <TextCell align="center">Save first</TextCell>
            </RecordItemCell>
          </RecordRowLayout>
        </RecordSectionItem>
      ) : null}

      {properties.length === 0 && !draft ? (
        <div className="rounded-2xl border border-dashed border-[rgba(58,58,58,0.72)] px-4 py-8 text-center text-[var(--foreground)]/65">
          No properties linked to this management company yet.
        </div>
      ) : (
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
                <RecordItemCell label="Show / Hide" columnKey="toggle">
                  <div className="flex min-h-[2.5rem] items-center justify-center">
                    <RecordRowToggleButton
                      expanded={isExpanded}
                      onToggle={() => onTogglePropertyTemplates(property.id)}
                      ariaLabel={isExpanded ? `Hide templates for ${property.name}` : `Show templates for ${property.name}`}
                    />
                  </div>
                </RecordItemCell>
                <RecordItemCell label="Open" columnKey="open">
                  <div className="flex min-h-[2.5rem] items-center justify-center">
                    <RecordRowOpenButton
                      onOpen={() => onOpenProperty(property.id)}
                      loading={loadingPropertyId === property.id}
                    />
                  </div>
                </RecordItemCell>
              </RecordRowLayout>
            </RecordSectionItem>
          )
        })
      )}
    </RecordSectionShell>
  )
}
