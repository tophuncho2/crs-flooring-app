"use client"

import { useCallback, useState } from "react"
import {
  RecordDetailClientScaffoldContext,
  RecordMultiSectionPanel,
  RecordPrimarySectionInstance,
} from "@/modules/shared/engines/record-view"
import { useRecordEntryNavigation } from "@/modules/shared/engines/common/record-entry"
import { buildDeleteConfirmationMessage } from "@/modules/shared/engines/common/feedback/confirm-delete"
import type { CategoryRecord, ManufacturerRecord, ProductRecord } from "@builders/db"
import type { InventoryRow } from "@builders/domain"
import { useProductPrimarySection } from "@/modules/products/controllers/use-product-primary-section"
import { ProductInventoryRowsSection } from "./product-inventory-rows-section"
import { ProductPrimaryFieldsSection } from "./product-primary-fields-section"

export function ProductRecordPanel({
  page,
  product,
  categoryOptions,
  manufacturerOptions,
  inventoryRows,
}: {
  page: RecordDetailClientScaffoldContext
  product: ProductRecord
  categoryOptions: CategoryRecord[]
  manufacturerOptions: ManufacturerRecord[]
  inventoryRows: InventoryRow[]
}) {
  const controller = useProductPrimarySection({
    page,
    product,
  })
  const inventoryNavigation = useRecordEntryNavigation("/dashboard/inventory")
  const [loadingInventoryId, setLoadingInventoryId] = useState<string | null>(null)

  const handleOpenInventory = useCallback(
    (inventoryId: string) => {
      page.confirmNavigation(() => {
        setLoadingInventoryId(inventoryId)
        inventoryNavigation.openRecord(inventoryId)
      })
    },
    [inventoryNavigation, page],
  )

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
        {
          key: "inventory-rows",
          type: "item",
          order: 10,
          render: () => (
            <ProductInventoryRowsSection
              subHeader={{
                summary: "Open an inventory row to manage stock, location, and cut logs.",
                isDirty: false,
                isSaving: false,
                hasConflict: false,
                canManage: false,
                showStatus: false,
              }}
              inventoryRows={inventoryRows}
              loadingInventoryId={loadingInventoryId}
              onOpenInventory={handleOpenInventory}
            />
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
