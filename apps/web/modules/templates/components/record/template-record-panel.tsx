"use client"

import {
  RecordMultiSectionPanel,
  RecordPrimarySectionInstance,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import { useTemplatePrimarySection } from "@/modules/templates/controllers/record/primary/use-template-primary-section"
import { useTemplateProductsSection } from "@/modules/templates/controllers/record/products/use-template-products-section"
import { useTemplatePlannedPaymentsSection } from "@/modules/templates/controllers/record/planned-payments/use-template-planned-payments-section"
import { useTemplateEntityInvolvementSection } from "@/modules/templates/controllers/record/entity-involvement/use-template-entity-involvement-section"
import { useTemplateSyncToWorkOrder } from "@/modules/templates/controllers/record/use-template-sync-to-work-order"
import {
  computeTemplateTaxCost,
  sumTemplatePlannedProductLineTotals,
  sumTemplateServiceItemLineTotalsByType,
  type TemplateDetail,
  type TemplateForm,
} from "@builders/domain"
import { TemplatePrimaryFieldsSection } from "./primary/template-primary-fields-section"
import { TemplateProductsSection } from "./template-products-section"
import { TemplatePaymentsSection } from "./template-payments-section"
import { TemplateEntityInvolvementSection } from "./template-entity-involvement-section"
import { TemplateRecordFooter } from "./footer"

export function TemplateRecordPanel({
  page,
  template,
}: {
  page: RecordDetailClientScaffoldContext
  template: TemplateDetail
}) {
  const primary = useTemplatePrimarySection({ page, template })
  const products = useTemplateProductsSection({
    template: primary.record,
    publishTemplate: primary.publishRecord,
  })
  const plannedPayments = useTemplatePlannedPaymentsSection({
    template: primary.record,
    publishTemplate: primary.publishRecord,
  })
  const entityInvolvement = useTemplateEntityInvolvementSection({
    template: primary.record,
    publishTemplate: primary.publishRecord,
  })
  const syncToWorkOrder = useTemplateSyncToWorkOrder(template.id)
  // Material Cost roll-up for the primary section = sum of the SAVED planned-product
  // line totals (reflects the last products save, not live unsaved grid edits).
  const materialCost = sumTemplatePlannedProductLineTotals(
    primary.record.plannedProducts.map((row) => ({ quantity: row.quantity, bidCost: row.productCost })),
  )
  // Per-item-type service-cost roll-up (Labor / Misc.) from the SAVED service items,
  // mirroring the Material Cost figure — reflects the last products save, not live edits.
  const serviceCostByType = sumTemplateServiceItemLineTotalsByType(
    primary.record.serviceItems.map((row) => ({
      itemType: row.itemType,
      quantity: row.quantity,
      bidCost: row.bidCost,
    })),
  )
  // Tax Cost roll-up = saved taxRate × the line totals of the TAXED rows across both
  // tables (planned products use productCost as the per-unit basis; service items use
  // bidCost). Saved-record based, like the cost roll-ups above.
  const taxCost = computeTemplateTaxCost(
    [
      ...primary.record.plannedProducts
        .filter((row) => row.taxed)
        .map((row) => ({ quantity: row.quantity, bidCost: row.productCost })),
      ...primary.record.serviceItems
        .filter((row) => row.taxed)
        .map((row) => ({ quantity: row.quantity, bidCost: row.bidCost })),
    ],
    primary.record.taxRate,
  )
  const isDirty =
    primary.primarySection.isDirty ||
    products.isDirty ||
    entityInvolvement.isDirty ||
    plannedPayments.isDirty
  const canSync =
    !isDirty &&
    !primary.primarySection.isSaving &&
    !products.isSaving &&
    !entityInvolvement.isSaving &&
    !plannedPayments.isSaving

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
                  materialCost={materialCost}
                  laborCost={serviceCostByType.LABOR}
                  miscCost={serviceCostByType.MISCELLANEOUS}
                  taxCost={taxCost}
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
            controller: {
              isDirty: products.isDirty,
              isSaving: products.isSaving,
              hasConflict: products.hasConflict,
            },
            render: () => <TemplateProductsSection products={products} />,
          },
          {
            key: "entity-involvement",
            type: "item",
            order: 15,
            dirtyLabel: "entity involvement",
            controller: {
              isDirty: entityInvolvement.isDirty,
              isSaving: entityInvolvement.isSaving,
              hasConflict: entityInvolvement.hasConflict,
            },
            render: () => <TemplateEntityInvolvementSection section={entityInvolvement} />,
          },
          {
            key: "payments",
            type: "item",
            order: 20,
            dirtyLabel: "payments",
            controller: {
              isDirty: plannedPayments.isDirty,
              isSaving: plannedPayments.isSaving,
              hasConflict: plannedPayments.hasConflict,
            },
            render: () => <TemplatePaymentsSection planned={plannedPayments} />,
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
