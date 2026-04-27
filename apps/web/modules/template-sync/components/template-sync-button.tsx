"use client"

import { useMemo, useState } from "react"
import { RefreshCw } from "lucide-react"
import { SidePanel } from "@/components/nav"
import { SelectDropdown, type DropdownOption } from "@/components/dropdowns"
import { FLOORING_PRIMARY_ACTION_BUTTON_COMPACT_CLASS_NAME } from "@/modules/shared/engines/common/display/accent-styles"

// Shell-only: real options will be wired in a follow-up.
// Cascade: Management Company (optional) → Property → Template.
// Property has a direct managementCompanyId FK; Template has a propertyId FK.
const MANAGEMENT_COMPANY_OPTIONS: ReadonlyArray<DropdownOption> = []
const PROPERTY_OPTIONS: ReadonlyArray<DropdownOption> = []
const TEMPLATE_OPTIONS: ReadonlyArray<DropdownOption> = []

export function TemplateSyncButton() {
  const [open, setOpen] = useState(false)
  const [managementCompanyId, setManagementCompanyId] = useState<string | null>(null)
  const [propertyId, setPropertyId] = useState<string | null>(null)
  const [templateId, setTemplateId] = useState<string | null>(null)

  const filteredPropertyOptions = useMemo<ReadonlyArray<DropdownOption>>(() => {
    if (!managementCompanyId) return PROPERTY_OPTIONS
    // Real filter wires in once option arrays carry managementCompanyId.
    return PROPERTY_OPTIONS
  }, [managementCompanyId])

  const filteredTemplateOptions = useMemo<ReadonlyArray<DropdownOption>>(() => {
    if (!propertyId) return []
    return TEMPLATE_OPTIONS
  }, [propertyId])

  function handleManagementCompanyChange(value: string | null) {
    setManagementCompanyId(value)
    setPropertyId(null)
    setTemplateId(null)
  }

  function handlePropertyChange(value: string | null) {
    setPropertyId(value)
    setTemplateId(null)
  }

  const canActOnTemplate = templateId !== null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open template sync"
        className="
          w-10 h-10 rounded-full
          bg-[var(--panel-background)]
          border border-[var(--panel-border)]
          flex items-center justify-center
          hover:bg-[var(--panel-hover)]
          transition
          shadow-[0_0_6px_rgba(59,130,246,0.25)]
        "
      >
        <RefreshCw size={18} className="text-blue-500" />
      </button>

      <SidePanel
        open={open}
        side="right"
        onClose={() => setOpen(false)}
        title="Template sync"
        widthClassName="w-80"
      >
        <div className="flex h-full flex-col gap-4 px-4 py-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-[var(--foreground)]/65">
              Management company
            </span>
            <SelectDropdown
              value={managementCompanyId}
              onChange={handleManagementCompanyChange}
              options={MANAGEMENT_COMPANY_OPTIONS}
              placeholder="Any management company (optional)"
              allowClear
              ariaLabel="Management company"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-[var(--foreground)]/65">
              Property
            </span>
            <SelectDropdown
              value={propertyId}
              onChange={handlePropertyChange}
              options={filteredPropertyOptions}
              placeholder="Select a property"
              allowClear
              ariaLabel="Property"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-[var(--foreground)]/65">
              Template
            </span>
            <SelectDropdown
              value={templateId}
              onChange={setTemplateId}
              options={filteredTemplateOptions}
              placeholder={propertyId ? "Select a template" : "Select a property first"}
              allowClear
              disabled={!propertyId}
              ariaLabel="Template"
            />
          </label>

          <div className="mt-auto flex flex-col gap-2 pt-4">
            <button
              type="button"
              disabled={!canActOnTemplate}
              className={FLOORING_PRIMARY_ACTION_BUTTON_COMPACT_CLASS_NAME}
            >
              Open
            </button>
            <button
              type="button"
              disabled={!canActOnTemplate}
              className={FLOORING_PRIMARY_ACTION_BUTTON_COMPACT_CLASS_NAME}
            >
              Sync
            </button>
          </div>
        </div>
      </SidePanel>
    </>
  )
}
