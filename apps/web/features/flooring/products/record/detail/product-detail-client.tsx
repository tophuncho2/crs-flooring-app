"use client"

import {
  RecordDetailClientScaffold,
  type RecordDetailClientScaffoldContext,
} from "@/features/shared/engines/record-view"
import { ProductRecordPanel } from "../panel/product-record-panel"
import type {
  CategoryOption,
  ManufacturerOption,
  ProductInventoryRow,
  ProductRow,
} from "../../domain/types"

export function ProductDetailClient({
  initialProduct,
  categoryOptions,
  manufacturerOptions,
  inventoryRows,
  backHref,
}: {
  initialProduct: ProductRow
  categoryOptions: CategoryOption[]
  manufacturerOptions: ManufacturerOption[]
  inventoryRows: ProductInventoryRow[]
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
