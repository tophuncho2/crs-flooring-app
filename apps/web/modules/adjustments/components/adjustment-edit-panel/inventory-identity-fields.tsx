"use client"

const LABEL_CLASS = "text-[10px] font-medium uppercase tracking-wide text-[var(--foreground)]/55"

export type InventoryIdentityValues = {
  invNumber: string
  rollNumber: string
  dyeLot: string
  note: string
}

const FIELDS: ReadonlyArray<{ key: keyof InventoryIdentityValues; label: string }> = [
  { key: "invNumber", label: "Inv #" },
  { key: "rollNumber", label: "Roll #" },
  { key: "dyeLot", label: "Dye lot" },
  { key: "note", label: "Note" },
]

function hasAnyValue(values: InventoryIdentityValues): boolean {
  return FIELDS.some(({ key }) => values[key].trim().length > 0)
}

function FieldGrid({ values }: { values: InventoryIdentityValues }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {FIELDS.map(({ key, label }) => {
        const value = values[key].trim()
        return (
          <div
            key={key}
            className="flex min-w-0 flex-col gap-0.5 rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] px-2.5 py-1.5"
          >
            <span className={LABEL_CLASS}>{label}</span>
            <span className="truncate text-sm text-[var(--foreground)]">
              {value.length > 0 ? value : "—"}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export type InventoryIdentityFieldsProps =
  | { mode: "locked"; values: InventoryIdentityValues }
  | {
      mode: "editable"
      values: InventoryIdentityValues
      expanded: boolean
      onToggle: () => void
      disabled?: boolean
      disabledPlaceholder?: string
    }

/**
 * Four-column inventory identity (inv# / roll# / dye lot / note), the
 * adjustment panel's replacement for the single `inventoryItem` string.
 *
 *   - `locked`: read-only grid pre-filled from the picked/frozen inventory.
 *   - `editable`: a trigger that opens the inventory takeover (whose four search
 *     bars do the actual filtering); shows the picked columns once chosen, or a
 *     placeholder when empty.
 */
export function InventoryIdentityFields(props: InventoryIdentityFieldsProps) {
  if (props.mode === "locked") {
    return <FieldGrid values={props.values} />
  }

  const filled = hasAnyValue(props.values)
  return (
    <button
      type="button"
      onClick={props.onToggle}
      disabled={props.disabled}
      aria-expanded={props.expanded}
      aria-label="Open inventory picker"
      className="w-full rounded-md text-left outline-none transition focus-visible:ring-1 focus-visible:ring-sky-500/40 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {filled ? (
        <FieldGrid values={props.values} />
      ) : (
        <span className="flex items-center rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] px-2.5 py-1.5 text-sm text-[var(--foreground)]/55">
          {props.disabled && props.disabledPlaceholder
            ? props.disabledPlaceholder
            : "Select inventory"}
        </span>
      )}
    </button>
  )
}
