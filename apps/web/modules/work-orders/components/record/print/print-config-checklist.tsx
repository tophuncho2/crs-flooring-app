"use client"

import { useMemo, type ReactNode } from "react"
import {
  resolvePrintConfig,
  WORK_ORDER_ADJUSTMENT_COLUMN_KEYS,
  WORK_ORDER_ADJUSTMENT_COLUMN_LABELS,
  WORK_ORDER_MATERIAL_COLUMN_KEYS,
  WORK_ORDER_MATERIAL_COLUMN_LABELS,
  WORK_ORDER_TOP_FIELD_KEYS,
  WORK_ORDER_TOP_FIELD_LABELS,
  type WorkOrderStoredPrintConfig,
} from "@builders/domain"

/**
 * The doc-type print-defaults editor — the config-only checkbox panel (Top
 * section fields · Adjustments include+columns · Requested Material
 * include+columns). Shares the ONE key/label source with the domain renderer and
 * the WO print configurator (`WORK_ORDER_*_KEYS` / `*_LABELS`). No row pickers and
 * no document-title selector (those are WO-instance / name concerns).
 *
 * Works on the RESOLVED full config internally (via {@link resolvePrintConfig}) so
 * every checkbox has a definite state, and emits a full config on every toggle —
 * a saved doc type therefore carries explicit values, while keys added to the
 * print surface AFTER a save still fall back to the code default on read.
 */
export function PrintConfigChecklist({
  value,
  editable,
  onChange,
}: {
  value: WorkOrderStoredPrintConfig
  editable: boolean
  onChange: (next: WorkOrderStoredPrintConfig) => void
}) {
  const full = useMemo(() => {
    const resolved = resolvePrintConfig(value, "")
    return {
      sections: resolved.sections,
      topFields: resolved.topFields,
      adjustmentColumns: resolved.adjustmentColumns,
      materialColumns: resolved.materialColumns,
    }
  }, [value])

  const emit = (next: WorkOrderStoredPrintConfig) => {
    if (editable) onChange(next)
  }

  const toggleTopField = (key: (typeof WORK_ORDER_TOP_FIELD_KEYS)[number]) =>
    emit({ ...full, topFields: { ...full.topFields, [key]: !full.topFields[key] } })

  const toggleSection = (key: "adjustments" | "material") =>
    emit({ ...full, sections: { ...full.sections, [key]: !full.sections[key] } })

  const toggleAdjustmentColumn = (key: (typeof WORK_ORDER_ADJUSTMENT_COLUMN_KEYS)[number]) =>
    emit({
      ...full,
      adjustmentColumns: { ...full.adjustmentColumns, [key]: !full.adjustmentColumns[key] },
    })

  const toggleMaterialColumn = (key: (typeof WORK_ORDER_MATERIAL_COLUMN_KEYS)[number]) =>
    emit({
      ...full,
      materialColumns: { ...full.materialColumns, [key]: !full.materialColumns[key] },
    })

  return (
    <div className="space-y-5 text-sm">
      <ChecklistSection title="Top section">
        {WORK_ORDER_TOP_FIELD_KEYS.map((key) => (
          <CheckRow
            key={key}
            checked={full.topFields[key]}
            disabled={!editable}
            onChange={() => toggleTopField(key)}
            label={WORK_ORDER_TOP_FIELD_LABELS[key]}
          />
        ))}
      </ChecklistSection>

      <ChecklistSection title="Adjustments">
        <CheckRow
          checked={full.sections.adjustments}
          disabled={!editable}
          onChange={() => toggleSection("adjustments")}
          label="Include section"
        />
        {full.sections.adjustments ? (
          <>
            <ColumnsHeading />
            {WORK_ORDER_ADJUSTMENT_COLUMN_KEYS.map((key) => (
              <CheckRow
                key={key}
                checked={full.adjustmentColumns[key]}
                disabled={!editable}
                onChange={() => toggleAdjustmentColumn(key)}
                label={WORK_ORDER_ADJUSTMENT_COLUMN_LABELS[key]}
              />
            ))}
            <p className="mt-1 text-xs text-neutral-400">Product &amp; Quantity always show.</p>
          </>
        ) : null}
      </ChecklistSection>

      <ChecklistSection title="Requested Material">
        <CheckRow
          checked={full.sections.material}
          disabled={!editable}
          onChange={() => toggleSection("material")}
          label="Include section"
        />
        {full.sections.material ? (
          <>
            <ColumnsHeading />
            {WORK_ORDER_MATERIAL_COLUMN_KEYS.map((key) => (
              <CheckRow
                key={key}
                checked={full.materialColumns[key]}
                disabled={!editable}
                onChange={() => toggleMaterialColumn(key)}
                label={WORK_ORDER_MATERIAL_COLUMN_LABELS[key]}
              />
            ))}
            <p className="mt-1 text-xs text-neutral-400">Product &amp; Qty / Unit always show.</p>
          </>
        ) : null}
      </ChecklistSection>
    </div>
  )
}

function ChecklistSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

function ColumnsHeading() {
  return (
    <p className="mt-2 mb-1 text-xs font-medium uppercase tracking-wide text-neutral-500">
      Columns
    </p>
  )
}

function CheckRow({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean
  disabled: boolean
  onChange: () => void
  label: string
}) {
  return (
    <label className={`flex items-center gap-2 ${disabled ? "cursor-default" : "cursor-pointer"}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="h-4 w-4 rounded border-neutral-300 text-sky-600 focus:ring-1 focus:ring-sky-500/40"
      />
      <span className="text-neutral-700">{label}</span>
    </label>
  )
}
