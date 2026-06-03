"use client"

import { ArrowRight } from "lucide-react"

const LABEL_CLASS = "text-[10px] font-medium uppercase tracking-wide text-[var(--foreground)]/55"

// Matches HubSidePanelPickerTrigger's open-linked button so the "open
// inventory" shortcut reads identically across the picker stack.
const OPEN_LINKED_BUTTON_CLASS_NAME =
  "inline-flex h-7 w-7 shrink-0 items-center justify-center self-center rounded border border-blue-500/40 bg-[var(--background)] text-[var(--foreground)]/70 transition hover:bg-blue-500/10 hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:cursor-not-allowed disabled:opacity-60"

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

type OpenLinkedProps = {
  onOpenLinked?: () => void
  openLinkedAriaLabel?: string
  openLinkedDisabled?: boolean
}

export type InventoryIdentityFieldsProps = OpenLinkedProps &
  (
    | { mode: "locked"; values: InventoryIdentityValues }
    | {
        mode: "editable"
        values: InventoryIdentityValues
        expanded: boolean
        onToggle: () => void
        disabled?: boolean
        disabledPlaceholder?: string
      }
  )

/**
 * Four-column inventory identity (inv# / roll# / dye lot / note), the
 * adjustment panel's replacement for the single `inventoryItem` string.
 *
 *   - `locked`: read-only grid pre-filled from the picked/frozen inventory.
 *   - `editable`: a trigger that opens the inventory takeover (whose four search
 *     bars do the actual filtering); shows the picked columns once chosen, or a
 *     placeholder when empty.
 *
 * An optional trailing arrow opens the linked inventory record, mirroring
 * `HubSidePanelPickerTrigger`.
 */
export function InventoryIdentityFields(props: InventoryIdentityFieldsProps) {
  const filled = hasAnyValue(props.values)
  const showOpenLinked = props.onOpenLinked !== undefined && filled

  const body =
    props.mode === "locked" ? (
      <FieldGrid values={props.values} />
    ) : (
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

  if (!showOpenLinked) {
    return body
  }

  return (
    <div className="flex items-stretch gap-1.5">
      <div className="min-w-0 flex-1">{body}</div>
      <button
        type="button"
        aria-label={props.openLinkedAriaLabel}
        title={props.openLinkedAriaLabel}
        onClick={props.onOpenLinked}
        disabled={props.openLinkedDisabled}
        className={OPEN_LINKED_BUTTON_CLASS_NAME}
      >
        <ArrowRight size={14} />
      </button>
    </div>
  )
}
