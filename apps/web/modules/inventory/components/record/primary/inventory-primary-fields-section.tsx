"use client"

import { useState } from "react"
import type { InventoryForm, InventoryRow, PaletteColor } from "@builders/domain"
import { CellAt, RecordColumnBreak, RecordSectionDivider } from "@/engines/record-view"
import {
  ColorField,
  ConversionFormulaPickerField,
  ConvertedBalanceField,
  CoveragePerUnitField,
  CoverageUnitPickerField,
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
  // Coverage-unit + formula pickers are async/paginated — the trigger label
  // derives only from `selectedLabel`. Hold the in-flight pick label locally and
  // reset it when the saved value changes (a save commits the pick; a record
  // swap loads the neighbour's values). Only the FK reaches the form/server.
  const savedCoverageUnitName = record.coverageUnitName ?? null
  const [pickedCoverageUnitLabel, setPickedCoverageUnitLabel] = useState<string | null>(null)
  const [seenCoverageUnitName, setSeenCoverageUnitName] = useState(savedCoverageUnitName)
  if (seenCoverageUnitName !== savedCoverageUnitName) {
    setSeenCoverageUnitName(savedCoverageUnitName)
    setPickedCoverageUnitLabel(null)
  }

  const savedFormulaName = record.conversionFormulaName ?? null
  const [pickedFormulaLabel, setPickedFormulaLabel] = useState<string | null>(null)
  const [seenFormulaName, setSeenFormulaName] = useState(savedFormulaName)
  if (seenFormulaName !== savedFormulaName) {
    setSeenFormulaName(savedFormulaName)
    setPickedFormulaLabel(null)
  }

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
            {/* Conversion cluster — the formula picker leads, above the editable
                Coverage/Unit + Coverage Unit pair (all seeded from the product). */}
            <CellAt col={1} row={5} colSpan={8}>
              <ConversionFormulaPickerField
                value={draft.conversionFormulaId || null}
                selectedLabel={
                  draft.conversionFormulaId ? pickedFormulaLabel ?? savedFormulaName : null
                }
                onChange={(id) => onFieldChange("conversionFormulaId", id ?? "")}
                onOptionSelected={(option) => setPickedFormulaLabel(option?.name ?? null)}
                disabled={!editable}
                ariaLabel="Select a conversion formula"
              />
            </CellAt>
            <CellAt col={1} row={6} colSpan={4}>
              <CoveragePerUnitField
                editable={editable}
                value={draft.coveragePerUnit}
                onChange={(value) => onFieldChange("coveragePerUnit", value)}
              />
            </CellAt>
            <CellAt col={5} row={6} colSpan={4}>
              <CoverageUnitPickerField
                value={draft.coverageUnitId || null}
                selectedLabel={
                  draft.coverageUnitId ? pickedCoverageUnitLabel ?? savedCoverageUnitName : null
                }
                onChange={(id) => onFieldChange("coverageUnitId", id ?? "")}
                onOptionSelected={(option) => setPickedCoverageUnitLabel(option?.name ?? null)}
                disabled={!editable}
                placeholder="Select coverage unit"
                ariaLabel="Select a coverage unit"
              />
            </CellAt>
            {/* Internal Notes — full width, closing the left flank beneath the
                conversion cluster */}
            <CellAt col={1} row={7} colSpan={8}>
              <InternalNotesField
                editable={editable}
                value={draft.internalNotes}
                onChange={(value) => onFieldChange("internalNotes", value)}
              />
            </CellAt>
          </InventoryFieldGrid>
        }
        right={
          <InventoryFieldGrid>
            {/* Product identity headline — full width, leading the flank above the
                stat block */}
            <CellAt col={1} row={1} colSpan={8}>
              <ProductNameField value={record.productName} />
            </CellAt>
            {/* Prominent stat block: Stock leads with the derived Converted balance
                to its right; Deducted + Starting stack beneath Stock. */}
            <CellAt col={1} row={2} colSpan={4}>
              <StockBalanceField value={record.stockBalance} unitAbbrev={record.unitAbbrev} />
            </CellAt>
            {/* Derived converted balance (on-read; blanks to "—" when the formula/
                coverage inputs don't resolve or the source unit mismatches). */}
            <CellAt col={5} row={2} colSpan={4}>
              <ConvertedBalanceField
                value={record.convertedStockBalance ?? ""}
                unitAbbrev={record.conversionUnitAbbrev ?? ""}
                prominent
              />
            </CellAt>
            {/* Deducted under Stock | Import # */}
            <CellAt col={1} row={3} colSpan={4}>
              <NetDeductedField value={record.netDeducted} unitAbbrev={record.unitAbbrev} />
            </CellAt>
            <CellAt col={5} row={3} colSpan={4}>
              <ImportNumberField value={record.importNumber} />
            </CellAt>
            {/* Starting under Deducted | PO # */}
            <CellAt col={1} row={4} colSpan={4}>
              <StartingStockReadonlyField value={record.startingStock} unitAbbrev={record.unitAbbrev} />
            </CellAt>
            <CellAt col={5} row={4} colSpan={4}>
              <PurchaseOrderNumberField value={record.purchaseOrderNumber} />
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
