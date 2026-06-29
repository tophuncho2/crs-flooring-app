"use client"

import type { InventoryForm, InventoryRow, PaletteColor } from "@builders/domain"
import { CellAt, RecordColumnBreak, RecordSectionDivider } from "@/engines/record-view"
import {
  ColorField,
  CreatedAtField,
  CreatedByField,
  DyeLotReadOnlyField,
  ImportNumberField,
  InventoryFieldGrid,
  InventoryNumberField,
  InternalNotesField,
  LocationField,
  NetDeductedField,
  NoteReadOnlyField,
  ProductNameField,
  PurchaseOrderNumberField,
  RollNumberReadOnlyField,
  StartingStockReadonlyField,
  StatusField,
  StockBalanceField,
  UpdatedAtField,
  UpdatedByField,
  WarehouseStaticField,
} from "../fields"

/**
 * The inventory "cells" grid for the record view's primary section, built on the
 * shared inventory field package (`../fields`) over the record-view engine.
 * Only Location, Internal Notes, and the archive (Status) chip are editable;
 * every other cell is a read-only "reference" cell (uneditable for now).
 *
 * Layout: a centered `RecordColumnBreak` splits the fields into two flanks —
 * left = identity + editable cluster, right = the stock / money numbers — then a
 * `RecordSectionDivider` terminates the section above a read-only metadata band
 * (Merged / Created / Updated). Category is intentionally hidden.
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
      <RecordColumnBreak
        left={
          <InventoryFieldGrid>
            {/* Inv # beside the Color that recolors its chip, above the product headline */}
            <CellAt col={1} row={1} colSpan={4}>
              <InventoryNumberField value={record.inventoryNumber} paletteColor={draft.color} />
            </CellAt>
            <CellAt col={5} row={1} colSpan={4}>
              <ColorField
                editable={editable}
                value={draft.color}
                onChange={(next) => onFieldChange("color", next)}
              />
            </CellAt>
            {/* Roll # | Warehouse */}
            <CellAt col={1} row={2} colSpan={4}>
              <RollNumberReadOnlyField value={record.rollNumber} />
            </CellAt>
            <CellAt col={5} row={2} colSpan={4}>
              <WarehouseStaticField warehouseName={warehouseName} />
            </CellAt>
            {/* Dye Lot | Location */}
            <CellAt col={1} row={3} colSpan={4}>
              <DyeLotReadOnlyField value={record.dyeLot} />
            </CellAt>
            <CellAt col={5} row={3} colSpan={4}>
              <LocationField
                editable={editable}
                value={draft.location}
                onChange={(value) => onFieldChange("location", value)}
              />
            </CellAt>
            {/* Note | Status */}
            <CellAt col={1} row={4} colSpan={4}>
              <NoteReadOnlyField value={record.note} />
            </CellAt>
            <CellAt col={5} row={4} colSpan={4}>
              <StatusField
                editable={editable}
                value={draft.isArchived}
                onChange={(next) => onFieldChange("isArchived", next)}
              />
            </CellAt>
            {/* PO # */}
            <CellAt col={1} row={5} colSpan={4}>
              <PurchaseOrderNumberField value={record.purchaseOrderNumber} />
            </CellAt>
          </InventoryFieldGrid>
        }
        right={
          <InventoryFieldGrid>
            {/* Stock + Deducted lead the flank as prominent stat cells, above the
                product headline */}
            <CellAt col={1} row={1} colSpan={4}>
              <StockBalanceField value={record.stockBalance} unitAbbrev={record.stockUnitAbbrev} />
            </CellAt>
            <CellAt col={5} row={1} colSpan={4}>
              <NetDeductedField value={record.netDeducted} unitAbbrev={record.stockUnitAbbrev} />
            </CellAt>
            {/* Identity headline */}
            <CellAt col={1} row={2} colSpan={8}>
              <ProductNameField value={record.productName} />
            </CellAt>
            {/* Starting | Import # */}
            <CellAt col={1} row={3} colSpan={4}>
              <StartingStockReadonlyField value={record.startingStock} unitAbbrev={record.stockUnitAbbrev} />
            </CellAt>
            <CellAt col={5} row={3} colSpan={4}>
              <ImportNumberField value={record.importNumber} />
            </CellAt>
            <CellAt col={1} row={4} colSpan={8}>
              <InternalNotesField
                editable={editable}
                value={draft.internalNotes}
                onChange={(value) => onFieldChange("internalNotes", value)}
              />
            </CellAt>
          </InventoryFieldGrid>
        }
      />

      <RecordSectionDivider />

      {/* Read-only metadata band: Created · Updated · Created by · Updated by */}
      <InventoryFieldGrid>
        <CellAt col={1} row={1} colSpan={4}>
          <CreatedAtField value={record.createdAt} />
        </CellAt>
        <CellAt col={5} row={1} colSpan={4}>
          <UpdatedAtField value={record.updatedAt} />
        </CellAt>
        <CellAt col={1} row={2} colSpan={4}>
          <CreatedByField value={record.createdBy} />
        </CellAt>
        <CellAt col={5} row={2} colSpan={4}>
          <UpdatedByField value={record.updatedBy} />
        </CellAt>
      </InventoryFieldGrid>
    </div>
  )
}
