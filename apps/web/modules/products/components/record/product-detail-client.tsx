"use client"

import {
  RecordDetailClientScaffold,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import type { CategoryRecord, ProductRecord } from "@builders/db"
import type { ProductStats } from "@builders/domain"
import { ProductRecordPanel } from "./product-record-panel"

export function ProductDetailClient({
  initialProduct,
  categoryOptions,
  stats,
  backHref,
}: {
  initialProduct: ProductRecord
  categoryOptions: CategoryRecord[]
  stats: ProductStats
  backHref: string
}) {
  return (
    <RecordDetailClientScaffold
      title="Product Hub"
      backHref={backHref}
      modeNotice={{ mode: "edit", label: "Product" }}
      dirtyMessage="You have unsaved product changes. Leave this product without saving?"
      headerVariant="section"
    >
      {(page: RecordDetailClientScaffoldContext) => (
        <ProductRecordPanel
          page={page}
          product={initialProduct}
          categoryOptions={categoryOptions}
          stats={stats}
        />
      )}
    </RecordDetailClientScaffold>
  )
}
