"use client"

import {
  RecordDetailClientScaffoldContext,
  RecordMultiSectionPanel,
  RecordPrimarySectionInstance,
} from "@/modules/shared/engines/record-view"
import { buildDeleteConfirmationMessage } from "@/modules/shared/engines/common/feedback/confirm-delete"
import type { CategoryRecord, ManufacturerRecord, ProductRecord } from "@builders/db"
import { useProductPrimarySection } from "@/modules/products/controllers/use-product-primary-section"
import { ProductPrimaryFieldsSection } from "./product-primary-fields-section"

export function ProductRecordPanel({
  page,
  product,
  categoryOptions,
  manufacturerOptions,
}: {
  page: RecordDetailClientScaffoldContext
  product: ProductRecord
  categoryOptions: CategoryRecord[]
  manufacturerOptions: ManufacturerRecord[]
}) {
  const controller = useProductPrimarySection({
    page,
    product,
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
          controller: controller.primarySection,
          render: () => (
            <RecordPrimarySectionInstance
              title="Product Details"
              error={controller.primarySection.error}
              noticeMessage={controller.primarySection.noticeMessage}
              noticeError={controller.primarySection.noticeError}
              isDirty={controller.primarySection.isDirty}
              isSaving={controller.primarySection.isSaving}
              hasConflict={controller.primarySection.hasConflict}
              onSave={() => void controller.primarySection.save()}
              onDiscard={controller.primarySection.discard}
              saveLabel="Save Product"
              savingLabel="Saving Product..."
              showHeader={false}
            >
              <ProductPrimaryFieldsSection
                product={controller.record}
                draft={controller.primarySection.localValue}
                categoryOptions={categoryOptions}
                manufacturerOptions={manufacturerOptions}
                disabled={controller.primarySection.isSaving}
                categoryReadOnly
                onFieldChange={(field, value) => {
                  controller.primarySection.setLocalValue((previous) => ({
                    ...previous,
                    [field]: value,
                  }))
                }}
              />
            </RecordPrimarySectionInstance>
          ),
        },
      ]}
      footer={{
        deleteLabel: "Delete Product",
        deleteConfirmMessage: buildDeleteConfirmationMessage("product"),
        onDelete: () => {
          void controller.deleteRecord?.()
        },
      }}
    />
  )
}
