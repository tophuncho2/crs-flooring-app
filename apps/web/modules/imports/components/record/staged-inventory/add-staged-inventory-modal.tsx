"use client"

import { useCallback, useState } from "react"
import {
  STAGED_INVENTORY_ROW_DYE_LOT_MAX,
  STAGED_INVENTORY_ROW_LOCATION_MAX,
  STAGED_INVENTORY_ROW_NOTE_MAX,
  STAGED_INVENTORY_ROW_ROLL_NUMBER_MAX,
  type CategoryOption,
  type ProductOption,
} from "@builders/domain"
import { AnchoredPanel } from "@/engines/common"
import {
  PickerList,
  PickerTrigger,
  type PickerListOption,
} from "@/engines/picker"
import { FormField, QuickCreateModal, TextCell, UnitCell } from "@/engines/record-view"
import { DataTable, type DataTableColumn } from "@/engines/list-view"
import type {
  StagedRowFormValues,
  StagedRowProductSeed,
} from "@/modules/imports/controllers/record/drafts"
import { useAddStagedInventoryModal } from "@/modules/imports/controllers/record/staged-inventory/use-add-staged-inventory-modal"

const PRODUCT_COLUMNS: DataTableColumn<ProductOption>[] = [
  { key: "name", label: "Product" },
  { key: "style", label: "Style" },
  { key: "color", label: "Color" },
  { key: "productNamingAddon", label: "Naming" },
  { key: "stockUnitAbbrev", label: "Unit", align: "end" },
]

function toCategoryOption(option: CategoryOption): PickerListOption {
  return { id: option.id, title: option.name, subtitles: [option.slug] }
}

/**
 * The section-level "Add Staged Inventory" create modal. Mounted only while open
 * (the section gates it) so its internal find/form state resets each open.
 *
 * Stage 1 (find): a category filter + Style/Color/Naming attribute bars drive a
 * product table; clicking a row picks that product. Stage 2 (form): the staged-
 * row fields (no cost/freight). "Add" appends one fully-populated DRAFT and
 * closes — the section's batch Save persists it.
 */
export function AddStagedInventoryModal({
  onClose,
  onAdd,
}: {
  onClose: () => void
  onAdd: (seed: StagedRowProductSeed, form: StagedRowFormValues) => void
}) {
  const controller = useAddStagedInventoryModal({ enabled: true, onAdd, onClose })
  const { pickedProduct } = controller

  return (
    <QuickCreateModal
      open
      title="Add Staged Inventory"
      onClose={onClose}
      onCreate={controller.submit}
      canCreate={controller.canCreate}
      isSaving={false}
      createLabel="Add"
      widthClassName="max-w-3xl"
    >
      {pickedProduct === null ? (
        <FindStage controller={controller} />
      ) : (
        <FormStage controller={controller} product={pickedProduct} />
      )}
    </QuickCreateModal>
  )
}

function FindStage({
  controller,
}: {
  controller: ReturnType<typeof useAddStagedInventoryModal>
}) {
  const { productController } = controller
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Category">
          <CategoryFilterField
            controller={controller}
          />
        </FormField>
        <FormField label="Style">
          <TextCell
            editable
            value={controller.style}
            onChange={controller.setStyle}
            ariaLabel="Filter by style"
          />
        </FormField>
        <FormField label="Color">
          <TextCell
            editable
            value={controller.color}
            onChange={controller.setColor}
            ariaLabel="Filter by color"
          />
        </FormField>
        <FormField label="Naming add-on">
          <TextCell
            editable
            value={controller.namingAddon}
            onChange={controller.setNamingAddon}
            ariaLabel="Filter by naming add-on"
          />
        </FormField>
      </div>

      <DataTable<ProductOption>
        rows={productController.options}
        columns={PRODUCT_COLUMNS}
        onRowClick={controller.pickProduct}
        getRowAriaLabel={(row) => `Select product ${row.name}`}
        empty={
          <span className="text-sm text-[var(--foreground)]/60">
            {productController.isLoading ? "Loading products…" : "No products match these filters."}
          </span>
        }
        footerSlot={
          productController.hasMore ? (
            <div className="flex justify-center py-2">
              <button
                type="button"
                onClick={productController.loadMore}
                disabled={productController.isFetchingMore}
                className="rounded-md border border-[var(--panel-border)] px-3 py-1.5 text-sm font-medium text-[var(--foreground)]/80 transition hover:border-sky-500/45 hover:text-[var(--foreground)] disabled:opacity-50"
              >
                {productController.isFetchingMore ? "Loading…" : "Load more"}
              </button>
            </div>
          ) : null
        }
      />
    </div>
  )
}

function FormStage({
  controller,
  product,
}: {
  controller: ReturnType<typeof useAddStagedInventoryModal>
  product: ProductOption
}) {
  const { form, setFormField } = controller
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 rounded-md border border-[var(--panel-border)] bg-[var(--panel-border)]/10 px-3 py-2">
        <span className="flex flex-col">
          <span className="text-sm font-semibold text-[var(--foreground)]">{product.name}</span>
          <span className="text-xs text-[var(--foreground)]/55">
            {[product.style, product.color].filter(Boolean).join(" · ") || "—"}
          </span>
        </span>
        <button
          type="button"
          onClick={controller.changeProduct}
          className="rounded-md border border-[var(--panel-border)] px-3 py-1.5 text-sm font-medium text-[var(--foreground)]/80 transition hover:border-sky-500/45 hover:text-[var(--foreground)]"
        >
          Change
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Roll #" currentLength={form.rollNumber.length} maxLength={STAGED_INVENTORY_ROW_ROLL_NUMBER_MAX}>
          <TextCell
            editable
            value={form.rollNumber}
            onChange={(next) => setFormField("rollNumber", next)}
            ariaLabel="Roll number"
          />
        </FormField>
        <FormField label="Starting stock" required>
          <UnitCell
            editable
            value={form.startingStock}
            onChange={(next) => setFormField("startingStock", next)}
            unit={product.stockUnitAbbrev || "unit"}
            ariaLabel="Starting stock"
          />
        </FormField>
        <FormField label="Dye lot" currentLength={form.dyeLot.length} maxLength={STAGED_INVENTORY_ROW_DYE_LOT_MAX}>
          <TextCell
            editable
            value={form.dyeLot}
            onChange={(next) => setFormField("dyeLot", next)}
            ariaLabel="Dye lot"
          />
        </FormField>
        <FormField label="Location" currentLength={form.location.length} maxLength={STAGED_INVENTORY_ROW_LOCATION_MAX}>
          <TextCell
            editable
            value={form.location}
            onChange={(next) => setFormField("location", next)}
            ariaLabel="Location"
          />
        </FormField>
        <FormField
          label="Note"
          className="col-span-2"
          currentLength={form.note.length}
          maxLength={STAGED_INVENTORY_ROW_NOTE_MAX}
        >
          <TextCell
            editable
            value={form.note}
            onChange={(next) => setFormField("note", next)}
            ariaLabel="Note"
          />
        </FormField>
      </div>
    </div>
  )
}

/**
 * Category filter trigger + anchored option list, mirroring the category half of
 * the staged-row product picker. Narrows the product table; clearable to "All".
 */
function CategoryFilterField({
  controller,
}: {
  controller: ReturnType<typeof useAddStagedInventoryModal>
}) {
  const [open, setOpen] = useState(false)
  const [searchSlot, setSearchSlot] = useState<HTMLDivElement | null>(null)
  const close = useCallback(() => setOpen(false), [])

  const handleSelect = useCallback(
    (option: PickerListOption) => {
      controller.selectCategory(option.id, option.title)
      setOpen(false)
    },
    [controller],
  )

  const trigger = (
    <PickerTrigger
      expanded={open}
      onToggle={() => setOpen((prev) => !prev)}
      selectedLabel={controller.categoryLabel}
      placeholder="All categories"
      ariaLabel="Category filter"
    />
  )

  const stickyHeader = <div ref={setSearchSlot} />

  return (
    <AnchoredPanel trigger={trigger} open={open} onClose={close} stickyHeader={stickyHeader}>
      {searchSlot === null ? null : (
        <PickerList<CategoryOption>
          controller={controller.categoryController}
          toOption={toCategoryOption}
          selectedId={controller.categoryId}
          selectedLabel={controller.categoryLabel}
          onSelect={handleSelect}
          onClear={controller.clearCategory}
          onCancel={close}
          searchPlaceholder="Search categories"
          searchPortalTarget={searchSlot}
        />
      )}
    </AnchoredPanel>
  )
}
