"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import {
  ConfirmDialog,
  RecordDrilldownSection,
  RecordItemSection,
  RecordMultiSectionPanel,
  RecordPrimarySectionInstance,
  RecordStepper,
  RecordStepperPortal,
  useRecordSwapGuard,
  type RecordDetailClientScaffoldContext,
  type RecordPanelSectionConfig,
} from "@/engines/record-view"
import type { CategoryRecord, ProductDetailRecord } from "@builders/db"
import type { InventoryIndicatorRow, ProductStats } from "@builders/domain"
import { useProductPrimarySection } from "@/modules/products/controllers/use-product-primary-section"
import { useIndicatorReconcile } from "@/modules/inventory-indicators"
import {
  NEW_INDICATOR_ID,
  useProductIndicatorSelection,
} from "@/modules/products/controllers/record/indicators/use-product-indicator-selection"
import { useIndicatorEditController } from "@/modules/products/controllers/record/indicators/use-indicator-edit-controller"
import {
  PRODUCT_INDICATORS_QUERY_KEY,
  productIndicatorByIdRequest,
  productIndicatorNeighborsRequest,
} from "@/modules/products/data/product-indicators-request"
import { ProductPrimaryFieldsSection } from "./primary/product-primary-fields-section"
import { ProductRecordFooter } from "./footer"
import { ProductIndicatorsList } from "./indicators/product-indicators-list"
import { EmbeddedIndicatorRecordView } from "./indicators/embedded-indicator-record-view"
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

  // ── Inventory-indicators drilldown section ──────────────────────────────
  const { indicator: selectedIndicatorId, setIndicator } = useProductIndicatorSelection()
  const reconcile = useIndicatorReconcile()
  const handleIndicatorMutated = useCallback(() => {
    reconcile()
  }, [reconcile])

  const edit = useIndicatorEditController({
    productId: product.id,
    publish: handleIndicatorMutated,
  })

  const [embeddedDirty, setEmbeddedDirty] = useState(false)
  const [selectedRow, setSelectedRow] = useState<InventoryIndicatorRow | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const handleSelectIndicator = useCallback(
    (id: string | null) => {
      if (id === null) setEmbeddedDirty(false)
      setIndicator(id)
    },
    [setIndicator],
  )

  // A cold `?indicator=new` deep-link (or a future "add" entry) opens the modal,
  // then clears the param so the list shows under the modal and a refresh won't
  // reopen it.
  useEffect(() => {
    if (selectedIndicatorId === NEW_INDICATOR_ID) {
      setCreateOpen(true)
      handleSelectIndicator(null)
    }
  }, [selectedIndicatorId, handleSelectIndicator])

  // Cold deep-link (e.g. from the standalone indicators list): the URL carries an
  // indicator id but the row isn't in memory. Resolve it by id.
  const needsFetch =
    selectedIndicatorId !== null &&
    selectedIndicatorId !== NEW_INDICATOR_ID &&
    (!selectedRow || selectedRow.id !== selectedIndicatorId)

  const byIdQuery = useQuery({
    enabled: needsFetch,
    queryKey: [...PRODUCT_INDICATORS_QUERY_KEY, product.id, "by-id", selectedIndicatorId],
    queryFn: ({ signal }) =>
      productIndicatorByIdRequest(product.id, selectedIndicatorId as string, signal),
  })

  const editRow =
    selectedRow && selectedRow.id === selectedIndicatorId
      ? selectedRow
      : byIdQuery.data && byIdQuery.data.id === selectedIndicatorId
        ? byIdQuery.data
        : null

  // Per-product stepper: walk prev/next indicators of THIS product, crossing page
  // boundaries. Neighbors are server-computed; fetched whenever an indicator is open.
  const stepperEnabled =
    selectedIndicatorId !== null && selectedIndicatorId !== NEW_INDICATOR_ID
  const neighborsQuery = useQuery({
    enabled: stepperEnabled,
    queryKey: [...PRODUCT_INDICATORS_QUERY_KEY, product.id, "neighbors", selectedIndicatorId],
    queryFn: ({ signal }) =>
      productIndicatorNeighborsRequest(product.id, selectedIndicatorId as string, signal),
  })
  const previousIndicator = stepperEnabled
    ? (neighborsQuery.data?.previousIndicator ?? null)
    : null
  const nextIndicator = stepperEnabled ? (neighborsQuery.data?.nextIndicator ?? null) : null

  const { guard: stepGuard, dialogProps: stepDialogProps } = useRecordSwapGuard({
    isDirty: embeddedDirty,
    discardMessage:
      "This indicator has unsaved changes. Stepping to another indicator will discard them.",
  })
  const stepTo = useCallback(
    (id: string) => stepGuard(() => handleSelectIndicator(id)),
    [stepGuard, handleSelectIndicator],
  )

  const indicatorStepper = (
    <RecordStepper
      label={editRow?.indicatorNumber ?? ""}
      onPrevious={previousIndicator ? () => stepTo(previousIndicator.id) : null}
      onNext={nextIndicator ? () => stepTo(nextIndicator.id) : null}
      previousAriaLabel="Previous indicator"
      nextAriaLabel="Next indicator"
    />
  )

  // Drive the edit controller from the URL selection (edit-only; create is the
  // modal). Keyed on the selection + resolved row so a save's re-seed inside the
  // controller is never clobbered.
  useEffect(() => {
    if (selectedIndicatorId === null || selectedIndicatorId === NEW_INDICATOR_ID) {
      edit.close()
    } else if (editRow) {
      edit.openEdit(editRow)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIndicatorId, editRow])

  const previousProductId = product.previousProduct?.id ?? null
  const nextProductId = product.nextProduct?.id ?? null

  // Lock the product primary while an indicator is open OR the create modal is up.
  const primaryLocked = selectedIndicatorId !== null || createOpen

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
          noticeInfo={
            selectedIndicatorId !== null
              ? "Product details are read-only while you edit an indicator. Close the indicator to edit them."
              : undefined
          }
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
            disabled={controller.primarySection.isSaving || primaryLocked}
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
      controller: { isDirty: embeddedDirty },
      render: (ctx) => (
        <RecordItemSection
          title="Inventory Indicators"
          subHeader={
            selectedIndicatorId === null
              ? {
                  canManage: false,
                  showStatus: false,
                  isDirty: false,
                  isSaving: false,
                  hasConflict: false,
                  actions: [
                    {
                      key: "add-indicator",
                      label: "+ Indicator",
                      onClick: () => setCreateOpen(true),
                    },
                  ],
                }
              : undefined
          }
        >
          <RecordDrilldownSection
            page={ctx.page}
            selectedId={selectedIndicatorId === NEW_INDICATOR_ID ? null : selectedIndicatorId}
            onSelect={handleSelectIndicator}
            hideBackBar
            renderList={(select) => (
              <ProductIndicatorsList
                productId={product.id}
                onSelect={(row) => {
                  setSelectedRow(row)
                  select(row.id)
                }}
              />
            )}
            renderDetail={(_id, onBack) => (
              <EmbeddedIndicatorRecordView
                controller={edit}
                hostPage={ctx.page}
                onBack={onBack}
                onDirtyChange={setEmbeddedDirty}
                actionsLeading={indicatorStepper}
              />
            )}
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
      <RecordMultiSectionPanel page={page} sections={sections} />
      <ProductRecordFooter onClose={page.closePage} onDelete={controller.deleteRecord} />
      {createOpen ? (
        <IndicatorCreateModal
          productId={product.id}
          productName={product.productNumber}
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false)
            handleIndicatorMutated()
          }}
        />
      ) : null}
      <ConfirmDialog {...stepDialogProps} />
    </>
  )
}
