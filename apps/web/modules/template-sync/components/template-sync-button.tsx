"use client"

import { useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import { RefreshCw } from "lucide-react"
import { SidePanel } from "@/components/nav"
import { ManagementCompanyPicker } from "@/modules/management-companies/components/picker/management-company-picker"
import { PropertyPicker } from "@/modules/properties/components/picker/property-picker"
import { TemplatePicker } from "@/modules/templates/components/picker/template-picker"
import { syncTemplateRequest } from "@/modules/template-sync/data/sync-template-request"
import { TemplateSyncPreviewSection } from "@/modules/template-sync/components/template-sync-preview-section"
import { FLOORING_PRIMARY_ACTION_BUTTON_COMPACT_CLASS_NAME } from "@/modules/shared/engines/common/display/accent-styles"

// Cascade: Management Company (optional) → Property → Template.
// Property has a direct managementCompanyId FK; Template has a propertyId FK.
// Each picker fetches its own server-side options via React Query;
// the bucket key folds in the parent filter so caches reset on parent change.

export function TemplateSyncButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [managementCompanyId, setManagementCompanyId] = useState<string | null>(null)
  const [propertyId, setPropertyId] = useState<string | null>(null)
  const [templateId, setTemplateId] = useState<string | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleManagementCompanyChange = useCallback((value: string | null) => {
    setManagementCompanyId(value)
    setPropertyId(null)
    setTemplateId(null)
  }, [])

  const handlePropertyChange = useCallback((value: string | null) => {
    setPropertyId(value)
    setTemplateId(null)
  }, [])

  const resetSelections = useCallback(() => {
    setManagementCompanyId(null)
    setPropertyId(null)
    setTemplateId(null)
    setErrorMessage(null)
  }, [])

  const handleClose = useCallback(() => {
    if (isSyncing) return
    setOpen(false)
  }, [isSyncing])

  const canActOnTemplate = templateId !== null
  const canCreateForProperty = propertyId !== null
  const hasSelections = managementCompanyId !== null || propertyId !== null || templateId !== null

  const handleOpen = useCallback(() => {
    if (!templateId) return
    setOpen(false)
    resetSelections()
    router.push(`/dashboard/templates/${templateId}`)
  }, [templateId, resetSelections, router])

  const handleCreate = useCallback(() => {
    if (!propertyId) return
    const params = new URLSearchParams({ propertyId })
    if (managementCompanyId) params.set("managementCompanyId", managementCompanyId)
    setOpen(false)
    resetSelections()
    router.push(`/dashboard/templates/new?${params.toString()}`)
  }, [propertyId, managementCompanyId, resetSelections, router])

  const handleSync = useCallback(async () => {
    if (!templateId || isSyncing) return
    setIsSyncing(true)
    setErrorMessage(null)
    try {
      const result = await syncTemplateRequest({ templateId })
      const newId = result.workOrder.id
      setOpen(false)
      resetSelections()
      router.push(`/dashboard/work-orders/${newId}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sync failed. Try again."
      setErrorMessage(message)
    } finally {
      setIsSyncing(false)
    }
  }, [templateId, isSyncing, resetSelections, router])

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
        onClose={handleClose}
        title="Template sync"
        widthClassName="w-[34rem]"
      >
        <div className="flex h-full flex-col gap-4 px-4 py-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-[var(--foreground)]/65">
              Management company
            </span>
            <ManagementCompanyPicker
              value={managementCompanyId}
              onChange={handleManagementCompanyChange}
              placeholder="Any management company (optional)"
              ariaLabel="Management company"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-[var(--foreground)]/65">
              Property
            </span>
            <PropertyPicker
              value={propertyId}
              onChange={handlePropertyChange}
              managementCompanyId={managementCompanyId}
              ariaLabel="Property"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-[var(--foreground)]/65">
              Template
            </span>
            <TemplatePicker
              value={templateId}
              onChange={setTemplateId}
              propertyId={propertyId}
              ariaLabel="Template"
            />
          </label>

          {templateId ? <TemplateSyncPreviewSection templateId={templateId} /> : null}

          {errorMessage ? (
            <p className="text-xs text-rose-400" role="alert">
              {errorMessage}
            </p>
          ) : null}

          <div className="mt-auto flex flex-col gap-2 pt-4">
            <button
              type="button"
              onClick={resetSelections}
              disabled={!hasSelections || isSyncing}
              className="rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--panel-hover)] disabled:opacity-60"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={!canCreateForProperty || isSyncing}
              className={FLOORING_PRIMARY_ACTION_BUTTON_COMPACT_CLASS_NAME}
            >
              New
            </button>
            <button
              type="button"
              onClick={handleOpen}
              disabled={!canActOnTemplate || isSyncing}
              className={FLOORING_PRIMARY_ACTION_BUTTON_COMPACT_CLASS_NAME}
            >
              Open
            </button>
            <button
              type="button"
              onClick={handleSync}
              disabled={!canActOnTemplate || isSyncing}
              className={FLOORING_PRIMARY_ACTION_BUTTON_COMPACT_CLASS_NAME}
            >
              {isSyncing ? "Syncing…" : "Sync"}
            </button>
          </div>
        </div>
      </SidePanel>
    </>
  )
}
