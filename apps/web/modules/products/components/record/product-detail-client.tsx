"use client"

import {
  RecordDetailClientScaffold,
  type RecordDetailClientScaffoldContext,
} from "@/modules/shared/engines/record-view"
import type { CategoryRecord, ManufacturerRecord, ProductRecord } from "@builders/db"
import type { InventoryRow } from "@builders/domain"
import { ProductRecordPanel } from "./product-record-panel"

export function ProductDetailClient({
  initialProduct,
  categoryOptions,
  manufacturerOptions,
  inventoryRows,
  backHref,
}: {
  initialProduct: ProductRecord
  categoryOptions: CategoryRecord[]
  manufacturerOptions: ManufacturerRecord[]
  inventoryRows: InventoryRow[]
  backHref: string
}) {
  return (
    <RecordDetailClientScaffold
      title={`Product ${initialProduct.name || initialProduct.id}`}
      backHref={backHref}
      dirtyMessage="You have unsaved product changes. Leave this product without saving?"
      headerVariant="section"
    >
      {(page: RecordDetailClientScaffoldContext) => (
        <ProductRecordPanel
          page={page}
          product={initialProduct}
          categoryOptions={categoryOptions}
          manufacturerOptions={manufacturerOptions}
          inventoryRows={inventoryRows}
        />
      )}
    </RecordDetailClientScaffold>
  )
}
