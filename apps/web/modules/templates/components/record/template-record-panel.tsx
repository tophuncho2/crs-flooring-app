"use client"

import {
  RecordMultiSectionPanel,
  RecordPrimarySectionInstance,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import { useTemplatePrimarySection } from "@/modules/templates/controllers/record/primary/use-template-primary-section"
import { useTemplateMaterialItemsSection } from "@/modules/templates/controllers/record/material-items/use-template-material-items-section"
import { useTemplateSyncToWorkOrder } from "@/modules/templates/controllers/record/use-template-sync-to-work-order"
import type { TemplateDetail, TemplateForm } from "@builders/domain"
import { TemplatePrimaryFieldsSection } from "./primary/template-primary-fields-section"
import { TemplateMaterialItemsSection } from "./material-items/template-material-items-section"
import { TemplateRecordFooter } from "./footer"

export function TemplateRecordPanel({
  page,
  template,
  onNewTemplate,
}: {
  page: RecordDetailClientScaffoldContext
  template: TemplateDetail
  /** Start a fresh template create flow — surfaced as a primary-header action. */
  onNewTemplate: () => void
}) {
  const primary = useTemplatePrimarySection({ page, template })
  const materialItems = useTemplateMaterialItemsSection({
    template: primary.record,
    publishTemplate: primary.publishRecord,
  })
  const syncToWorkOrder = useTemplateSyncToWorkOrder(template.id)
  const isDirty = primary.primarySection.isDirty || materialItems.isDirty
  const canSync = !isDirty && !primary.primarySection.isSaving && !materialItems.isSaving

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
                  {
                    key: "new-template",
                    label: "+ Template",
                    tone: "neutral",
                    onClick: onNewTemplate,
                  },
                ]}
              >
                <TemplatePrimaryFieldsSection
                  draft={primary.primarySection.localValue}
                  detail={{
                    templateNumber: primary.record.templateNumber,
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
                    createdAt: primary.record.createdAt,
                    updatedAt: primary.record.updatedAt,
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
