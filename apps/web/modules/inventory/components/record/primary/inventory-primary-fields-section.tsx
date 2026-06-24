"use client"

import type { InventoryForm, InventoryRow, PaletteColor } from "@builders/domain"
import { CellAt } from "@/engines/record-view"
import {
  ColorField,
  CostReadonlyField,
  CreatedAtField,
  DyeLotReadOnlyField,
  FreightReadonlyField,
  ImportNumberField,
  InventoryFieldGrid,
  InventoryNumberField,
  InternalNotesField,
  LocationField,
  MergedField,
  NetDeductedField,
  NoteReadOnlyField,
  ProductNameField,
  PurchaseOrderNumberField,
  RollNumberReadOnlyField,
  StartingStockReadonlyField,
  StatusField,
  StockBalanceField,
  UpdatedAtField,
  WarehouseStaticField,
} from "../fields"

/**
 * The inventory "cells" grid for the record view's primary section, built on the
 * shared inventory field package (`../fields`) over the record-view engine.
 * Only Location, Internal Notes, and the archive (Status) chip are editable;
 * every other cell is a read-only "reference" cell (uneditable for now).
 *
 * Layout: a primary block (identity + editable + stock/dates) then a divider,
 * then the remaining reference cells below — the divider mirrors the property
 * record view's section divider (`border-t`, not yet a primitive). Category is
 * intentionally hidden. Analog of `ManufacturerPrimaryFieldsSection`.
 */
export function InventoryPrimaryFieldsSection({
  draft,
  record,
  warehouseName,
  editable,
  onFieldChange,
}: {
  draft: InventoryForm
  record: InventoryRow
  warehouseName: string | null
  editable: boolean
  onFieldChange: (field: keyof InventoryForm, value: string | boolean | PaletteColor) => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <InventoryFieldGrid>
        {/* Left column, top-down: Product · Warehouse · Location · Inv# · Roll#
            · Dye Lot · Note · Internal Notes · Status */}
        <CellAt col={1} row={1} colSpan={4}>
          <ProductNameField value={record.productName} />
        </CellAt>
        <CellAt col={1} row={2} colSpan={4}>
          <WarehouseStaticField warehouseName={warehouseName} />
        </CellAt>
        <CellAt col={1} row={3} colSpan={4}>
          <LocationField
            editable={editable}
            value={draft.location}
            onChange={(value) => onFieldChange("location", value)}
          />
        </CellAt>
        <CellAt col={1} row={4} colSpan={4}>
          <InventoryNumberField value={record.inventoryNumber} paletteColor={draft.color} />
        </CellAt>
        <CellAt col={1} row={5} colSpan={4}>
          <RollNumberReadOnlyField value={record.rollNumber} />
        </CellAt>
        <CellAt col={1} row={6} colSpan={4}>
          <DyeLotReadOnlyField value={record.dyeLot} />
        </CellAt>
        <CellAt col={1} row={7} colSpan={4}>
          <NoteReadOnlyField value={record.note} />
        </CellAt>
        <CellAt col={1} row={8} colSpan={4}>
          <InternalNotesField
            editable={editable}
            value={draft.internalNotes}
            onChange={(value) => onFieldChange("internalNotes", value)}
          />
        </CellAt>
        <CellAt col={1} row={9} colSpan={4}>
          <StatusField
            editable={editable}
            value={draft.isArchived}
            onChange={(next) => onFieldChange("isArchived", next)}
          />
        </CellAt>
        <CellAt col={1} row={10} colSpan={4}>
          <ColorField
            editable={editable}
            value={draft.color}
            onChange={(next) => onFieldChange("color", next)}
          />
        </CellAt>

        {/* Right column (2 cols wide), aligned from Product down: Stock ·
            Deducted · Starting Stock */}
        <CellAt col={5} row={1} colSpan={2}>
          <StockBalanceField value={record.stockBalance} unitAbbrev={record.stockUnitAbbrev} />
        </CellAt>
        <CellAt col={5} row={2} colSpan={2}>
          <NetDeductedField value={record.netDeducted} unitAbbrev={record.stockUnitAbbrev} />
        </CellAt>
        <CellAt col={5} row={3} colSpan={2}>
          <StartingStockReadonlyField value={record.startingStock} unitAbbrev={record.stockUnitAbbrev} />
        </CellAt>
        <CellAt col={5} row={4} colSpan={2}>
          <CostReadonlyField value={record.cost} />
        </CellAt>
        <CellAt col={5} row={5} colSpan={2}>
          <FreightReadonlyField value={record.freight} />
        </CellAt>
      </InventoryFieldGrid>

      {/* Section divider — mirrors the property record view's between-section
          divider. Not yet extracted into a record-view primitive. */}
      <div className="border-t border-[var(--panel-border)]" />

      <InventoryFieldGrid>
        <CellAt col={1} row={1} colSpan={2}>
          <PurchaseOrderNumberField value={record.purchaseOrderNumber} />
        </CellAt>
        <CellAt col={3} row={1} colSpan={2}>
          <ImportNumberField value={record.importNumber} />
        </CellAt>
        <CellAt col={5} row={1} colSpan={2}>
          <CreatedAtField value={record.createdAt} />
        </CellAt>
        <CellAt col={5} row={2} colSpan={2}>
          <UpdatedAtField value={record.updatedAt} />
        </CellAt>
        <CellAt col={1} row={2} colSpan={2}>
          <MergedField wasMerged={record.wasMerged} />
        </CellAt>
      </InventoryFieldGrid>
    </div>
  )
}
