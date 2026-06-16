"use client"

import type { InventoryForm, InventoryRow } from "@builders/domain"
import { CellAt } from "@/engines/record-view"
import {
  CategoryNameField,
  DyeLotField,
  FifoReceivedField,
  ImportNumberField,
  InventoryFieldGrid,
  InventoryNumberField,
  InternalNotesField,
  LocationField,
  MergedField,
  NetDeductedField,
  NoteField,
  ProductNameField,
  PurchaseOrderNumberField,
  RollNumberField,
  StartingStockReadonlyField,
  StatusField,
  StockBalanceField,
  UpdatedAtField,
  WarehouseStaticField,
} from "../fields"

const NOOP = () => {}

/**
 * The inventory "cells" grid for the record view's primary section, built on the
 * shared inventory field package (`../fields`) over the record-view engine.
 * Only Location, Internal Notes, and the archive (Status) chip are editable;
 * Warehouse renders static. Beneath the editable block, every remaining
 * inventory table column is surfaced as a read-only "reference" cell (uneditable
 * for now). Analog of `ManufacturerPrimaryFieldsSection`.
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
  onFieldChange: (field: keyof InventoryForm, value: string | boolean) => void
}) {
  return (
    <>
      <InventoryFieldGrid>
        <CellAt col={1} colSpan={4}>
          <WarehouseStaticField warehouseName={warehouseName} />
        </CellAt>
        <CellAt col={1} colSpan={4}>
          <LocationField
            editable={editable}
            value={draft.location}
            onChange={(value) => onFieldChange("location", value)}
          />
        </CellAt>
        <CellAt col={1} colSpan={4}>
          <InternalNotesField
            editable={editable}
            value={draft.internalNotes}
            onChange={(value) => onFieldChange("internalNotes", value)}
          />
        </CellAt>
        <CellAt col={1} colSpan={4}>
          <StatusField
            editable={editable}
            value={draft.isArchived}
            onChange={(next) => onFieldChange("isArchived", next)}
          />
        </CellAt>
      </InventoryFieldGrid>

      {/* Read-only reference cells — every inventory table column not already an
          editable cell above, surfaced here as display-only (uneditable for now).
          Two per row, in table order; pulled straight from the persisted row. */}
      <InventoryFieldGrid>
        <CellAt col={1} row={1} colSpan={4}>
          <StockBalanceField value={record.stockBalance} unitAbbrev={record.stockUnitAbbrev} />
        </CellAt>
        <CellAt col={5} row={1} colSpan={4}>
          <NetDeductedField value={record.netDeducted} unitAbbrev={record.stockUnitAbbrev} />
        </CellAt>
        <CellAt col={1} row={2} colSpan={4}>
          <StartingStockReadonlyField value={record.startingStock} unitAbbrev={record.stockUnitAbbrev} />
        </CellAt>
        <CellAt col={5} row={2} colSpan={4}>
          <ProductNameField value={record.productName} />
        </CellAt>
        <CellAt col={1} row={3} colSpan={4}>
          <InventoryNumberField value={record.inventoryNumber} />
        </CellAt>
        <CellAt col={5} row={3} colSpan={4}>
          <RollNumberField editable={false} value={record.rollNumber} onChange={NOOP} />
        </CellAt>
        <CellAt col={1} row={4} colSpan={4}>
          <DyeLotField editable={false} value={record.dyeLot} onChange={NOOP} />
        </CellAt>
        <CellAt col={5} row={4} colSpan={4}>
          <NoteField editable={false} value={record.note} onChange={NOOP} />
        </CellAt>
        <CellAt col={1} row={5} colSpan={4}>
          <CategoryNameField value={record.categoryName} />
        </CellAt>
        <CellAt col={5} row={5} colSpan={4}>
          <PurchaseOrderNumberField value={record.purchaseOrderNumber} />
        </CellAt>
        <CellAt col={1} row={6} colSpan={4}>
          <ImportNumberField value={record.importNumber} />
        </CellAt>
        <CellAt col={5} row={6} colSpan={4}>
          <FifoReceivedField value={record.fifoReceivedAt} />
        </CellAt>
        <CellAt col={1} row={7} colSpan={4}>
          <UpdatedAtField value={record.updatedAt} />
        </CellAt>
        <CellAt col={5} row={7} colSpan={4}>
          <MergedField wasMerged={record.wasMerged} />
        </CellAt>
      </InventoryFieldGrid>
    </>
  )
}
