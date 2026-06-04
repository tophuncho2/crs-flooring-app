"use client"

import { useCallback } from "react"
import {
  RecordMultiSectionPanel,
  RecordPrimarySectionInstance,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import { useTemplatePrimarySection } from "@/modules/templates/controllers/record/use-template-primary-section"
import { useTemplateMaterialItemsSection } from "@/modules/templates/controllers/record/use-template-material-items-section"
import { useTemplateSyncToWorkOrder } from "@/modules/templates/controllers/record/use-template-sync-to-work-order"
import type { PropertyHubSaveResult } from "@/modules/properties/controllers/property-hub-side-panel"
import type { JobType, TemplateDetail, TemplateForm } from "@builders/domain"
import { TemplatePrimaryFieldsSection } from "./template-primary-fields-section"
import { TemplateMaterialItemsSection } from "./template-material-items-section"
import { TemplateRecordFooter } from "./footer"

export function TemplateRecordPanel({
  page,
  template,
}: {
  page: RecordDetailClientScaffoldContext
  template: TemplateDetail
}) {
  const primary = useTemplatePrimarySection({ page, template })
  const materialItems = useTemplateMaterialItemsSection({
    template: primary.record,
    publishTemplate: primary.publishRecord,
  })
  const syncToWorkOrder = useTemplateSyncToWorkOrder(template.id)
  const isDirty = primary.primarySection.isDirty || materialItems.isDirty
  const canSync = !isDirty && !primary.primarySection.isSaving && !materialItems.isSaving

  const handleHubEntitySaved = useCallback(
    (result: PropertyHubSaveResult) => {
      const current = primary.record
      if (!current) return
      if (result.kind === "mc") {
        if (current.managementCompanyId !== result.managementCompany.id) return
        primary.patchRecord({ managementCompanyName: result.managementCompany.name })
        return
      }
      if (current.propertyId !== result.property.id) return
      const property = result.property
      primary.patchRecord({
        propertyName: property.name,
        propertyStreetAddress: property.streetAddress,
        propertyCity: property.city,
        propertyState: property.state,
        propertyPostalCode: property.zip,
        propertyInstructions: property.instructions,
        managementCompanyId: property.managementCompany?.id ?? null,
        managementCompanyName: property.managementCompany?.name ?? null,
      })
    },
    [primary],
  )

  const handleJobTypeRenamed = useCallback(
    (jobType: JobType) => {
      const current = primary.record
      if (!current || current.jobTypeId !== jobType.id) return
      primary.patchRecord({ jobTypeName: jobType.name })
    },
    [primary],
  )

  return (
    <>
      <RecordMultiSectionPanel
        page={page}
        sections={[
          {
            key: "primary",
            type: "field",
            slot: "primary",
            order: 0,
            dirtyLabel: "primary",
            controller: primary.primarySection,
            render: () => (
              <RecordPrimarySectionInstance
                title="Template Details"
                error={primary.primarySection.error ?? syncToWorkOrder.errorMessage}
                noticeMessage={primary.primarySection.noticeMessage}
                noticeError={primary.primarySection.noticeError}
                isDirty={primary.primarySection.isDirty}
                isSaving={primary.primarySection.isSaving}
                hasConflict={primary.primarySection.hasConflict}
                onSave={() => void primary.primarySection.save()}
                onDiscard={primary.primarySection.discard}
                saveLabel="Save Template"
                savingLabel="Saving Template..."
                showHeader={false}
                actions={[
                  {
                    key: "sync-to-work-order",
                    label: syncToWorkOrder.isSyncing ? "Syncing…" : "Sync to Work Order",
                    tone: "primary",
                    onClick: () => void syncToWorkOrder.sync(),
                    disabled: !canSync || syncToWorkOrder.isSyncing,
                  },
                ]}
              >
                <TemplatePrimaryFieldsSection
                  draft={primary.primarySection.localValue}
                  detail={{
                    propertyId: primary.record.propertyId,
                    propertyName: primary.record.propertyName,
                    propertyStreetAddress: primary.record.propertyStreetAddress,
                    propertyCity: primary.record.propertyCity,
                    propertyState: primary.record.propertyState,
                    propertyPostalCode: primary.record.propertyPostalCode,
                    propertyInstructions: primary.record.propertyInstructions,
                    managementCompanyId: primary.record.managementCompanyId,
                    managementCompanyName: primary.record.managementCompanyName,
                    jobTypeId: primary.record.jobTypeId,
                    jobTypeName: primary.record.jobTypeName,
                    warehouseId: primary.record.warehouseId,
                    warehouseName: primary.record.warehouseName,
                  }}
                  disabled={primary.primarySection.isSaving}
                  onFieldChange={(field, value) => {
                    primary.primarySection.setLocalValue((previous: TemplateForm) => ({
                      ...previous,
                      [field]: value,
                    }))
                  }}
                  onFieldsChange={(patch) => {
                    primary.primarySection.setLocalValue((previous: TemplateForm) => ({
                      ...previous,
                      ...patch,
                    }))
                  }}
                  onHubEntitySaved={handleHubEntitySaved}
                  onJobTypeRenamed={handleJobTypeRenamed}
                />
              </RecordPrimarySectionInstance>
            ),
          },
          {
            key: "material-items",
            type: "item",
            order: 10,
            dirtyLabel: "material items",
            controller: materialItems,
            render: () => (
              <TemplateMaterialItemsSection
                items={materialItems.items}
                isDirty={materialItems.isDirty}
                isSaving={materialItems.isSaving}
                hasConflict={materialItems.hasConflict}
                error={materialItems.error?.message ?? null}
                noticeMessage={materialItems.noticeMessage}
                noticeError={materialItems.noticeError}
                onSave={() => void materialItems.save()}
                onDiscard={() => materialItems.discard()}
                onAddItem={materialItems.addItem}
                onChangeField={materialItems.changeField}
                onChangeCategoryFilter={materialItems.changeCategoryFilter}
                onSetProductSnapshot={materialItems.setProductSnapshot}
                onRemoveItem={materialItems.removeItem}
              />
            ),
          },
        ]}
      />
      <TemplateRecordFooter
        onClose={page.closePage}
        onDelete={primary.deleteRecord}
      />
    </>
  )
}
