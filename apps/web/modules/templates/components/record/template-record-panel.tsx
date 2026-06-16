"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Pencil, Plus } from "lucide-react"
import {
  RecordMultiSectionPanel,
  RecordOptionsMenu,
  RecordPrimarySectionInstance,
  type RecordDetailClientScaffoldContext,
  type RecordOptionsMenuItem,
} from "@/engines/record-view"
import {
  buildCurrentRecordEntryPath,
  buildPropertyRecordHref,
  buildRecordCreateHref,
  buildRecordDetailHref,
} from "@/hooks/navigation/routes"
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

  // Temporary home for the MC / Property / + New property nav buttons: the
  // primary header's Options menu. Targets derive from the saved record + the
  // live draft propertyId; these move to the cell label row once that shared
  // primitive merges. Open MC reflects the saved MC until save.
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const returnTo = buildCurrentRecordEntryPath(pathname, searchParams)
  const mcId = primary.record.managementCompanyId
  const propertyId = primary.primarySection.localValue.propertyId || null
  const editable = !primary.primarySection.isSaving

  const navItems: RecordOptionsMenuItem[] = [
    {
      key: "open-management-company",
      label: "Open management company",
      icon: <Pencil size={14} />,
      disabled: !mcId,
      onClick: () => {
        if (mcId) {
          router.push(buildRecordDetailHref("/dashboard/management-companies", mcId, returnTo))
        }
      },
    },
    {
      key: "open-property",
      label: "Open property",
      icon: <Pencil size={14} />,
      disabled: !propertyId,
      onClick: () => {
        if (propertyId) {
          router.push(buildPropertyRecordHref(propertyId, mcId, returnTo))
        }
      },
    },
    ...(editable
      ? [
          {
            key: "new-property",
            label: "New property",
            icon: <Plus size={14} />,
            onClick: () =>
              router.push(buildRecordCreateHref("/dashboard/management-companies", { returnTo })),
          },
        ]
      : []),
  ]

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
                actionsTrailing={<RecordOptionsMenu items={navItems} />}
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
