"use client"

import { normalizeAddressState } from "@builders/domain"
import { CellAt } from "@/components/layout-grid"
import { FormField } from "@/components/fields"
import { TextCell } from "@/components/cells"

export type AddressFieldsValue = {
  streetAddress: string
  city: string
  state: string
  zip: string
}

export type AddressEditCellProps = {
  value: AddressFieldsValue
  onChange: (field: keyof AddressFieldsValue, value: string) => void
  editable?: boolean
  label?: string
  /** Prefix for the inner inputs' aria-labels, e.g. "Management company". */
  ariaPrefix?: string
  col?: number
  colSpan?: number
}

/**
 * One "Address" cell grouping the structured street / city / state / zip
 * inputs into a single labeled block — street on top, city · state · zip
 * beneath. Keeps the discrete fields intact (`state` is normalized to a
 * 2-letter code on change). Renders read-only when `editable` is false, so the
 * same cell serves edit forms and read-only displays identically. Shared by
 * the property and management-company hub forms.
 */
export function AddressEditCell({
  value,
  onChange,
  editable = true,
  label = "Address",
  ariaPrefix,
  col = 1,
  colSpan = 8,
}: AddressEditCellProps) {
  const prefix = ariaPrefix ? `${ariaPrefix} ` : ""
  return (
    <CellAt col={col} colSpan={colSpan}>
      <FormField label={label}>
        <div className="flex flex-col gap-2">
          <TextCell
            editable={editable}
            value={value.streetAddress}
            onChange={(next) => onChange("streetAddress", next)}
            placeholder="Street address"
            ariaLabel={`${prefix}Street address`}
          />
          <div className="flex gap-2">
            <div className="min-w-0 flex-1">
              <TextCell
                editable={editable}
                value={value.city}
                onChange={(next) => onChange("city", next)}
                placeholder="City"
                ariaLabel={`${prefix}City`}
              />
            </div>
            <div className="w-16 shrink-0">
              <TextCell
                editable={editable}
                value={value.state}
                onChange={(next) => onChange("state", normalizeAddressState(next))}
                placeholder="ST"
                ariaLabel={`${prefix}State`}
              />
            </div>
            <div className="w-24 shrink-0">
              <TextCell
                editable={editable}
                value={value.zip}
                onChange={(next) => onChange("zip", next)}
                placeholder="Zip"
                ariaLabel={`${prefix}Zip`}
              />
            </div>
          </div>
        </div>
      </FormField>
    </CellAt>
  )
}
