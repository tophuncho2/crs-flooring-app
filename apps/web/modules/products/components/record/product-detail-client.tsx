"use client"

import {
  RecordDetailClientScaffold,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import type { CategoryRecord, ProductRecord } from "@builders/db"
import { ProductRecordPanel } from "./product-record-panel"

export function ProductDetailClient({
  initialProduct,
  categoryOptions,
  backHref,
}: {
  initialProduct: ProductRecord
  categoryOptions: CategoryRecord[]
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
        />
      )}
    </RecordDetailClientScaffold>
  )
}
