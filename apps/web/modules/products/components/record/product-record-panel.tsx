"use client"

import { useCallback, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  RecordItemSection,
  RecordMultiSectionPanel,
  RecordPrimarySectionInstance,
  RecordStepperPortal,
  type RecordDetailClientScaffoldContext,
  type RecordPanelSectionConfig,
} from "@/engines/record-view"
import type { CategoryRecord, ProductDetailRecord } from "@builders/db"
import type { InventoryIndicatorPage, InventoryIndicatorRow, ProductStats } from "@builders/domain"
import { useProductPrimarySection } from "@/modules/products/controllers/use-product-primary-section"
import { useIndicatorReconcile } from "@/modules/inventory-indicators"
import { useProductIndicatorsSection } from "@/modules/products/controllers/record/indicators/use-product-indicators-section"
import {
  PRODUCT_INDICATORS_QUERY_KEY,
  productIndicatorsAllRequest,
} from "@/modules/products/data/product-indicators-request"
import { ProductPrimaryFieldsSection } from "./primary/product-primary-fields-section"
import { ProductRecordFooter } from "./footer"
import { ProductIndicatorsGrid } from "./indicators/product-indicators-grid"
import { IndicatorCreateModal } from "./indicators/indicator-create-modal"

export function ProductRecordPanel({
  page,
  product,
  categoryOptions,
  stats,
}: {
  page: RecordDetailClientScaffoldContext
  product: ProductDetailRecord
  categoryOptions: CategoryRecord[]
  stats: ProductStats
}) {
  const router = useRouter()
  const controller = useProductPrimarySection({ page, product })

  // ── Inventory-indicators section (inline-editable, diff-save) ────────────
  const reconcile = useIndicatorReconcile()
  const [createOpen, setCreateOpen] = useState(false)

  const queryClient = useQueryClient()
  const sectionQueryKey = useMemo(
    () => [...PRODUCT_INDICATORS_QUERY_KEY, product.id, "section-all"],
    [product.id],
  )
  const indicatorsQuery = useQuery({
    queryKey: sectionQueryKey,
    queryFn: ({ signal }) => productIndicatorsAllRequest(product.id, signal),
  })
  const serverRows = indicatorsQuery.data?.rows ?? []
  const hasMore = indicatorsQuery.data?.hasMore ?? false

  // Co-fetch analog of `publishRecord`: mirror a section-save's fresh rows into
  // the query cache so the controller's server prop matches its new baseline.
  const syncServerRows = useCallback(
    (rows: InventoryIndicatorRow[]) => {
      queryClient.setQueryData(sectionQueryKey, (previous) => ({
        rows,
        hasMore: (previous as InventoryIndicatorPage | undefined)?.hasMore ?? false,
      }))
    },
    [queryClient, sectionQueryKey],
  )

  const indicators = useProductIndicatorsSection({
    productId: product.id,
    serverRows,
    // OCC token shared with the primary section — the live product record token.
    expectedUpdatedAt: controller.record.updatedAt,
    syncServerRows,
  })

  const indicatorCount = indicators.items.length

  const previousProductId = product.previousProduct?.id ?? null
  const nextProductId = product.nextProduct?.id ?? null

  const sections: RecordPanelSectionConfig[] = [
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
          saveLabel="Save"
          savingLabel="Saving..."
          showHeader={false}
        >
          <ProductPrimaryFieldsSection
            product={controller.record}
            draft={controller.primarySection.localValue}
            categoryOptions={categoryOptions}
            entityName={controller.record.entityName || null}
            disabled={controller.primarySection.isSaving}
            categoryReadOnly
            stats={stats}
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
      key: "indicators",
      type: "item",
      order: 10,
      dirtyLabel: "indicator",
      controller: { isDirty: indicators.isDirty },
      render: () => (
        <RecordItemSection
          title="Inventory Indicators"
          flush
          capabilities={{ editable: true, supportsSaveDiscard: true, supportsAddRow: true }}
          noticeMessage={indicators.noticeMessage}
          noticeError={indicators.noticeError}
          subHeader={{
            statusLeading: (
              <span className="inline-flex items-center rounded-xl border border-[rgba(58,58,58,0.72)] bg-[var(--panel-hover)] px-3 py-2 text-sm text-[var(--foreground)]/75">
                {indicatorCount} indicator{indicatorCount === 1 ? "" : "s"}
              </span>
            ),
            isDirty: indicators.isDirty,
            isSaving: indicators.isSaving,
            hasConflict: indicators.hasConflict,
            onSave: () => void indicators.save(),
            onDiscard: () => indicators.discard(),
            saveLabel: "Save",
            savingLabel: "Saving...",
            discardLabel: "Discard",
            error: indicators.error ? indicators.error.message : null,
            actions: [
              {
                key: "add",
                label: "+ Indicator",
                kind: "add-row",
                onClick: () => setCreateOpen(true),
                disabled: indicators.isSaving,
              },
            ],
          }}
        >
          {hasMore ? (
            <p className="px-1 pb-3 text-sm text-amber-400">
              Showing the first {serverRows.length} indicators. Refine on the Inventory Indicators
              list to see the rest.
            </p>
          ) : null}
          <ProductIndicatorsGrid
            items={indicators.items}
            editable={!indicators.isSaving}
            onChangeField={indicators.changeField}
            onRemoveRow={indicators.removeRow}
          />
        </RecordItemSection>
      ),
    },
  ]

  return (
    <>
      {/* Walks the global PROD-number line (◀ PROD-n ▶) from the top bar.
          Product detail is a per-id page, so a step router-navigates to the
          neighbor's page; the portal's dirty guard prompts first when edited. */}
      <RecordStepperPortal
        label={product.productNumber}
        isDirty={page.isDirty}
        discardMessage="This product has unsaved changes. Stepping to another product will discard them."
        onPrevious={
          previousProductId ? () => router.push(`/dashboard/products/${previousProductId}`) : null
        }
        onNext={nextProductId ? () => router.push(`/dashboard/products/${nextProductId}`) : null}
      />
      <RecordMultiSectionPanel page={page} sections={sections} />
      <ProductRecordFooter onClose={page.closePage} onDelete={controller.deleteRecord} />
      {createOpen ? (
        <IndicatorCreateModal
          productId={product.id}
          productName={product.productNumber}
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false)
            reconcile()
          }}
        />
      ) : null}
    </>
  )
}
