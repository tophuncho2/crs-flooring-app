"use client"

import {
  RecordMultiSectionPanel,
  RecordPrimarySectionInstance,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import { useTemplatePrimarySection } from "@/modules/templates/controllers/record/primary/use-template-primary-section"
import { useTemplatePlannedProductsSection } from "@/modules/templates/controllers/record/planned-products/use-template-planned-products-section"
import { useTemplateInvoiceProductsSection } from "@/modules/templates/controllers/record/invoice-products/use-template-invoice-products-section"
import { useTemplateSyncToWorkOrder } from "@/modules/templates/controllers/record/use-template-sync-to-work-order"
import type { TemplateDetail, TemplateForm } from "@builders/domain"
import { TemplatePrimaryFieldsSection } from "./primary/template-primary-fields-section"
import { TemplateProductsSection } from "./template-products-section"
import { TemplateRecordFooter } from "./footer"

export function TemplateRecordPanel({
  page,
  template,
}: {
  page: RecordDetailClientScaffoldContext
  template: TemplateDetail
}) {
  const primary = useTemplatePrimarySection({ page, template })
  const plannedProducts = useTemplatePlannedProductsSection({
    template: primary.record,
    publishTemplate: primary.publishRecord,
  })
  const invoiceProducts = useTemplateInvoiceProductsSection({
    template: primary.record,
    publishTemplate: primary.publishRecord,
  })
  const syncToWorkOrder = useTemplateSyncToWorkOrder(template.id)
  const isDirty =
    primary.primarySection.isDirty || plannedProducts.isDirty || invoiceProducts.isDirty
  const canSync =
    !isDirty &&
    !primary.primarySection.isSaving &&
    !plannedProducts.isSaving &&
    !invoiceProducts.isSaving

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
                saveLabel="Save"
                savingLabel="Saving..."
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
                    templateNumber: primary.record.templateNumber,
                    color: primary.record.color,
                    propertyId: primary.record.propertyId,
                    propertyName: primary.record.propertyName,
                    propertyStreetAddress: primary.record.propertyStreetAddress,
                    propertyCity: primary.record.propertyCity,
                    propertyState: primary.record.propertyState,
                    propertyPostalCode: primary.record.propertyPostalCode,
                    propertyInstructions: primary.record.propertyInstructions,
                    entityId: primary.record.entityId,
                    entityName: primary.record.entityName,
                    jobTypeId: primary.record.jobTypeId,
                    jobTypeName: primary.record.jobTypeName,
                    warehouseId: primary.record.warehouseId,
                    warehouseName: primary.record.warehouseName,
                    createdAt: primary.record.createdAt,
                    updatedAt: primary.record.updatedAt,
                    createdBy: primary.record.createdBy,
                    updatedBy: primary.record.updatedBy,
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
            key: "products",
            type: "item",
            order: 10,
            dirtyLabel: "products",
            // The panel's dirty/saving/conflict signal is the OR of BOTH sides —
            // the toggle host shows one at a time but either can be mid-edit.
            controller: {
              isDirty: plannedProducts.isDirty || invoiceProducts.isDirty,
              isSaving: plannedProducts.isSaving || invoiceProducts.isSaving,
              hasConflict: plannedProducts.hasConflict || invoiceProducts.hasConflict,
            },
            // `key={template.id}` resets the mode toggle to Planned when stepping
            // to a neighbor template (mirrors the WO material-items host).
            render: () => (
              <TemplateProductsSection
                key={template.id}
                planned={plannedProducts}
                invoice={invoiceProducts}
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
