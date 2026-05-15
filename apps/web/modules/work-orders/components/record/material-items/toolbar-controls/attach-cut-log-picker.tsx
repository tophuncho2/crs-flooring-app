"use client"

import { useState } from "react"
import { AsyncRichDropdown } from "@/components/dropdowns/async-rich-dropdown"

export type AttachCutLogPickerProps = {
  workOrderItemId: string
  disabled?: boolean
}

// UI placeholder. The search → attach flow (domain/data/application/api) is not
// wired yet; this renders the trigger so the layout next to "+ Add Cut Log" is
// in place.
export function AttachCutLogPicker({ disabled }: AttachCutLogPickerProps) {
  const [query, setQuery] = useState("")

  return (
    <div className="w-56">
      <AsyncRichDropdown
        value={null}
        onChange={() => {}}
        options={[]}
        query={query}
        onQueryChange={setQuery}
        placeholder="Attach existing cut log"
        searchPlaceholder="Search unattached cut logs"
        emptyMessage="No unattached cut logs"
        loadingMessage="Searching…"
        clearLabel="Clear selection"
        disabled={disabled}
        ariaLabel="Attach existing cut log to this material item"
      />
    </div>
  )
}
