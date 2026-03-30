"use client"

import { useCallback, useState } from "react"
import {
  RecordDetailClientScaffoldContext,
  RecordPanelFooter,
  RecordPrimarySectionInstance,
  RecordSectionStack,
  RecordSectionSubHeader,
} from "@/features/shared/engines/record-view"
import { useRecordEntryNavigation } from "@/features/shared/engines/common/record-entry"
import { buildDeleteConfirmationMessage } from "@/features/flooring/shared/ui/table/confirm-delete"
import { ProductInventoryRowsSection } from "./sections/product-inventory-rows-section"
import { ProductPrimaryFieldsSection } from "./sections/product-primary-fields-section"
import { useProductPrimarySection } from "./controllers/use-product-primary-section"
import type {
  CategoryOption,
  ManufacturerOption,
  ProductInventoryRow,
  ProductRow,
} from "../../domain/types"

export function ProductRecordPanel({
  page,
  product,
  categoryOptions,
  manufacturerOptions,
  inventoryRows,
}: {
  page: RecordDetailClientScaffoldContext
  product: ProductRow
  categoryOptions: CategoryOption[]
  manufacturerOptions: ManufacturerOption[]
  inventoryRows: ProductInventoryRow[]
}) {
  const controller = useProductPrimarySection({
    page,
    product,
  })
  const inventoryNavigation = useRecordEntryNavigation("/dashboard/flooring/inventory")
  const [customBaseColors, setCustomBaseColors] = useState<string[]>([])
  const [newBaseColor, setNewBaseColor] = useState("")
  const [expandedInventoryIds, setExpandedInventoryIds] = useState<string[]>([])
  const [loadingInventoryId, setLoadingInventoryId] = useState<string | null>(null)

  const handleAddBaseColorOption = useCallback(() => {
    const trimmed = newBaseColor.trim()
    if (!trimmed) {
      return
    }

    setCustomBaseColors((previous) =>
      Array.from(new Set([...previous, trimmed])).sort((left, right) => left.localeCompare(right)),
    )
    controller.primarySection.setLocalValue((previous) => ({
      ...previous,
      baseColor: trimmed,
    }))
    setNewBaseColor("")
  }, [controller.primarySection, newBaseColor])

  const handleToggleInventoryCutLogs = useCallback((inventoryId: string) => {
    setExpandedInventoryIds((previous) =>
      previous.includes(inventoryId)
        ? previous.filter((value) => value !== inventoryId)
        : [...previous, inventoryId],
    )
  }, [])

  const handleOpenInventory = useCallback((inventoryId: string) => {
    page.confirmNavigation(() => {
      setLoadingInventoryId(inventoryId)
      inventoryNavigation.openRecord(inventoryId)
    })
  }, [inventoryNavigation, page])

  return (
    <div className="space-y-4">
      <RecordSectionStack>
        {page.isPrimarySectionOpen ? (
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
              customBaseColors={customBaseColors}
              newBaseColor={newBaseColor}
              disabled={controller.primarySection.isSaving}
              onFieldChange={(field, value) => {
                controller.primarySection.setLocalValue((previous) => ({
                  ...previous,
                  [field]: value,
                }))
              }}
              onNewBaseColorChange={setNewBaseColor}
              onAddBaseColorOption={handleAddBaseColorOption}
            />
          </RecordPrimarySectionInstance>
        ) : null}

        <ProductInventoryRowsSection
          actionPanel={
            <RecordSectionSubHeader
              summary="Open inventory rows to manage stock, location, and cut logs."
              isDirty={false}
              isSaving={false}
              hasConflict={false}
              canManage={false}
              showStatus={false}
            />
          }
          inventoryRows={inventoryRows}
          expandedInventoryIds={expandedInventoryIds}
          loadingInventoryId={loadingInventoryId}
          onToggleInventoryCutLogs={handleToggleInventoryCutLogs}
          onOpenInventory={handleOpenInventory}
        />
      </RecordSectionStack>

      <RecordPanelFooter
        deleteLabel="Delete Product"
        deleteConfirmMessage={buildDeleteConfirmationMessage("product")}
        onDelete={() => void controller.deleteRecord()}
        onClose={page.closePage}
      />
    </div>
  )
}
