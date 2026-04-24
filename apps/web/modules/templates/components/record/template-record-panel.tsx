"use client"

import {
  RecordMultiSectionPanel,
  RecordPrimarySectionInstance,
  type RecordDetailClientScaffoldContext,
} from "@/modules/shared/engines/record-view"
import { buildDeleteConfirmationMessage } from "@/modules/shared/engines/common/feedback/confirm-delete"
import { useTemplatePrimarySection } from "@/modules/templates/controllers/use-template-primary-section"
import { useTemplateMaterialItemsSection } from "@/modules/templates/controllers/use-template-material-items-section"
import type { TemplateDetail, TemplateForm } from "@builders/domain"
import {
  TemplatePrimaryFieldsSection,
  type TemplateDropdownOption,
} from "./template-primary-fields-section"
import {
  TemplateMaterialItemsSection,
  type MaterialItemProductOption,
} from "./template-material-items-section"

export function TemplateRecordPanel({
  page,
  template,
  managementOptions,
  propertyOptions,
  jobTypeOptions,
  warehouseOptions,
  productOptions,
}: {
  page: RecordDetailClientScaffoldContext
  template: TemplateDetail
  managementOptions: TemplateDropdownOption[]
  propertyOptions: TemplateDropdownOption[]
  jobTypeOptions: TemplateDropdownOption[]
  warehouseOptions: TemplateDropdownOption[]
  productOptions: MaterialItemProductOption[]
}) {
  const primary = useTemplatePrimarySection({ page, template })
  const materialItems = useTemplateMaterialItemsSection({
    template: primary.record,
    publishTemplate: primary.publishRecord,
  })

  return (
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
              error={primary.primarySection.error}
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
            >
              <TemplatePrimaryFieldsSection
                draft={primary.primarySection.localValue}
                managementOptions={managementOptions}
                propertyOptions={propertyOptions}
                jobTypeOptions={jobTypeOptions}
                warehouseOptions={warehouseOptions}
                disabled={primary.primarySection.isSaving}
                onFieldChange={(field, value) => {
                  primary.primarySection.setLocalValue((previous: TemplateForm) => ({
                    ...previous,
                    [field]: value,
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
              productOptions={productOptions}
              onChangeField={materialItems.changeField}
              onRemoveItem={materialItems.removeItem}
              noticeMessage={materialItems.noticeMessage}
              noticeError={materialItems.noticeError}
              subHeader={{
                isDirty: materialItems.isDirty,
                isSaving: materialItems.isSaving,
                hasConflict: materialItems.hasConflict,
                error: materialItems.error,
                onSave: () => void materialItems.save(),
                onDiscard: () => materialItems.discard(),
                saveLabel: "Save Material Items",
                savingLabel: "Saving Material Items...",
                actions: [
                  {
                    key: "add-material-item",
                    kind: "add-row",
                    label: "Add Material Item",
                    onClick: materialItems.addItem,
                    disabled: materialItems.isSaving,
                  },
                ],
              }}
            />
          ),
        },
      ]}
      footer={{
        deleteLabel: "Delete Template",
        deleteConfirmMessage: buildDeleteConfirmationMessage("template"),
        onDelete: () => void primary.deleteRecord(),
      }}
    />
  )
}
