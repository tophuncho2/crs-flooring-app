"use client"

import { useRouter } from "next/navigation"
import {
  RecordDetailClientScaffoldContext,
  RecordMultiSectionPanel,
  RecordPrimarySectionInstance,
  RecordStepperPortal,
} from "@/engines/record-view"
import type { CategoryRecord, ProductDetailRecord } from "@builders/db"
import type { ProductStats } from "@builders/domain"
import { useProductPrimarySection } from "@/modules/products/controllers/use-product-primary-section"
import { ProductPrimaryFieldsSection } from "./primary/product-primary-fields-section"
import { ProductStatisticsSection } from "./statistics/product-statistics-section"
import { ProductRecordFooter } from "./footer"

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
  const controller = useProductPrimarySection({
    page,
    product,
  })

  const previousProductId = product.previousProduct?.id ?? null
  const nextProductId = product.nextProduct?.id ?? null

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
          previousProductId
            ? () => router.push(`/dashboard/products/${previousProductId}`)
            : null
        }
        onNext={
          nextProductId
            ? () => router.push(`/dashboard/products/${nextProductId}`)
            : null
        }
      />
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
            key: "statistics",
            type: "item",
            order: 20,
            render: () => <ProductStatisticsSection stats={stats} />,
          },
        ]}
      />
      <ProductRecordFooter
        onClose={page.closePage}
        onDelete={controller.deleteRecord}
      />
    </>
  )
}
